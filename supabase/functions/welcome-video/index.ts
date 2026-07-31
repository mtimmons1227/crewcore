import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Pick the Synthesia template for the recruit's path. Falls back to the NEW template
// until you configure separate returning/transfer templates.
function templateFor(memberType: string): string | undefined {
  const env = (k: string) => Deno.env.get(k) || undefined;
  if (memberType === "returning") return env("SYNTHESIA_TEMPLATE_RETURNING") || env("SYNTHESIA_TEMPLATE_NEW");
  if (memberType === "transfer") return env("SYNTHESIA_TEMPLATE_TRANSFER") || env("SYNTHESIA_TEMPLATE_NEW");
  return env("SYNTHESIA_TEMPLATE_NEW");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { token } = await req.json();
    if (!token) return json({ status: "unavailable" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: cyc } = await supabase
      .from("registration_cycle")
      .select("id, member_type, chapter_id, sport_id, season_id")
      .eq("access_token", token)
      .maybeSingle();
    if (!cyc) return json({ status: "unavailable" });

    const memberType = cyc.member_type ?? "new";
    const KEY = Deno.env.get("SYNTHESIA_API_KEY");

    // Reuse a cached render for this chapter+sport+season+path if one exists.
    const { data: existing } = await supabase
      .from("welcome_video")
      .select("*")
      .eq("chapter_id", cyc.chapter_id)
      .eq("sport_id", cyc.sport_id)
      .eq("season_id", cyc.season_id)
      .eq("member_type", memberType)
      .maybeSingle();

    if (existing) {
      if (existing.status === "complete") {
        return json({ status: "complete", synthesia_id: existing.synthesia_id });
      }
      if (KEY && existing.synthesia_id) {
        const v = await fetch(`https://api.synthesia.io/v2/videos/${existing.synthesia_id}`, {
          headers: { Authorization: KEY },
        }).then((r) => r.json()).catch(() => null);
        if (v && v.status === "complete") {
          await supabase.from("welcome_video")
            .update({ status: "complete", updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          return json({ status: "complete", synthesia_id: existing.synthesia_id });
        }
      }
      return json({ status: "in_progress" });
    }

    // No render yet. If Synthesia isn't configured, tell the page to use the generic video.
    const templateId = templateFor(memberType);
    if (!KEY || !templateId) return json({ status: "unconfigured" });

    const [{ data: chapter }, { data: sport }] = await Promise.all([
      supabase.from("chapter").select("slug, governing_body_id").eq("id", cyc.chapter_id).maybeSingle(),
      supabase.from("sport").select("name").eq("id", cyc.sport_id).maybeSingle(),
    ]);
    let stateShort = "";
    if (chapter?.governing_body_id) {
      const { data: gb } = await supabase.from("governing_body")
        .select("short_name").eq("id", chapter.governing_body_id).maybeSingle();
      stateShort = gb?.short_name ?? "";
    }

    const templateData: Record<string, string> = {
      sport_name: sport?.name ?? "",
      state_organization_short_name: stateShort,
      chapter_short_name: chapter?.slug ?? "",
      // When your template adds these variables, add them here:
      // season: "2026-2027",
      // first_name: firstName,
    };

    const render = await fetch("https://api.synthesia.io/v2/videos/fromTemplate", {
      method: "POST",
      headers: { Authorization: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        templateData,
        title: `Welcome - ${templateData.chapter_short_name} ${templateData.sport_name}`,
        visibility: "public",
        test: false,
      }),
    }).then((r) => r.json()).catch(() => null);

    if (!render || !render.id) return json({ status: "failed" });

    await supabase.from("welcome_video").insert({
      chapter_id: cyc.chapter_id,
      sport_id: cyc.sport_id,
      season_id: cyc.season_id,
      member_type: memberType,
      synthesia_id: render.id,
      status: "in_progress",
    });

    return json({ status: "in_progress", synthesia_id: render.id });
  } catch (e) {
    return json({ status: "error", message: String(e) });
  }
});
