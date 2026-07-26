import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Shared secret gating this endpoint. Power Automate must send it as the
// 'x-arbiter-secret' request header.
//
// ⚠️ The LIVE deployment currently hardcodes this value. For repo hygiene it is read from an
// env secret here. Before this file matches production, run:
//    supabase secrets set ARBITER_IMPORT_SECRET=<the-value>
// then redeploy:
//    supabase functions deploy arbiter-import --no-verify-jwt
const SHARED_SECRET = Deno.env.get("ARBITER_IMPORT_SECRET") ?? "";

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Coerce Arbiter's varied truthy encodings ("Yes", "true", 1, "Paid", ...) to boolean.
function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return ["yes", "y", "true", "t", "1", "paid", "cleared", "complete", "completed", "eligible", "active"].includes(s);
  }
  return false;
}

// Tolerant field lookup: ignores case, spaces, punctuation so CSV headers like
// "THSBOA Dues Paid" map to "thsboaduespaid".
function pick(o: Record<string, unknown>, wants: string[]): unknown {
  for (const k of Object.keys(o)) {
    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (wants.includes(norm)) return o[k];
  }
  return undefined;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = req.headers.get("x-arbiter-secret");
  if (!SHARED_SECRET || secret !== SHARED_SECRET) return json({ error: "Unauthorized" }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  let rows: Record<string, unknown>[];
  if (Array.isArray(body)) rows = body as Record<string, unknown>[];
  else if (body && Array.isArray((body as any).officials)) rows = (body as any).officials;
  else if (body && typeof body === "object") rows = [body as Record<string, unknown>];
  else return json({ error: "Expected an official object or an array of officials" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: unknown[] = [];
  for (const r of rows) {
    const email = pick(r, ["email", "officialemail", "emailaddress"]);
    const dues = toBool(pick(r, ["thsboaduespaid", "duespaid", "statedues", "dues"]));
    const bg = toBool(pick(r, ["backgroundcheckcleared", "backgroundcheck", "bgcheck", "backgroundcleared"]));
    const reg = toBool(pick(r, ["regularseasoneligible", "regularseason", "regulareligible"]));
    const playoff = toBool(pick(r, ["playoffeligible", "playoff"]));

    const { data, error } = await supabase.rpc("arbiter_import_official", {
      p_email: email ?? null,
      p_dues_paid: dues,
      p_bg_cleared: bg,
      p_regular_eligible: reg,
      p_playoff_eligible: playoff,
    });

    if (error) results.push({ email: email ?? null, ok: false, error: error.message });
    else results.push({ ok: true, ...(data as Record<string, unknown>) });
  }

  const summary = {
    received: rows.length,
    matched: results.filter((r: any) => r.matched).length,
    changed: results.filter((r: any) => Array.isArray(r.steps_completed) && r.steps_completed.length > 0).length,
    results,
  };
  return json(summary, 200);
});
