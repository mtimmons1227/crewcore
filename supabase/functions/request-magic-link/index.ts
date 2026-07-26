// Receives { email, chapter_id, sport_id } from the lead-capture page.
// Creates/finds the registration cycle via start_registration RPC, then emails
// the magic link to the person's on-file address. Never returns the token.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
// Optional:          APP_URL (default http://localhost:5173)

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { email, chapter_id, sport_id, member_type } = await req.json();
    if (!email || !chapter_id || !sport_id) {
      return json({ error: 'Missing required fields' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Create or find cycle — returns { status, cycle_id }, never the token
    const { data: rpcData, error: rpcError } = await admin.rpc('start_registration', {
      p_email: email,
      p_chapter_id: chapter_id,
      p_sport_id: sport_id,
      p_member_type: member_type ?? 'new',
    });
    if (rpcError) return json({ error: rpcError.message }, 400);

    const { cycle_id } = rpcData as { status: string; cycle_id: string };

    // Retrieve token via service-role (bypasses RLS — never exposed to client)
    const { data: cycle, error: cycleErr } = await admin
      .from('registration_cycle')
      .select('access_token, person_id')
      .eq('id', cycle_id)
      .single();
    if (cycleErr || !cycle) return json({ error: 'Cycle not found' }, 500);

    // Email goes to the person's on-file address, not the supplied email
    const { data: person, error: personErr } = await admin
      .from('person')
      .select('email, full_name')
      .eq('id', cycle.person_id)
      .single();
    if (personErr || !person?.email) return json({ error: 'Person email not found' }, 500);

    const magicLink = `${APP_URL}/r/${cycle.access_token}`;
    const firstName = person.full_name?.split(' ')[0] ?? 'there';

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'CrewCore <noreply@crewcore.app>',
        to: [person.email],
        subject: 'Your CrewCore registration link',
        html: `<p>Hi ${firstName},</p>
<p>Here is your personal registration link. Click it to track your progress through the officiating onboarding checklist:</p>
<p><a href="${magicLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open my registration</a></p>
<p style="color:#6b7280;font-size:12px">Keep this link private — it gives direct access to your registration.</p>`,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Resend error:', err);
      return json({ error: 'Failed to send email' }, 500);
    }

    return json({ status: 'sent' });
  } catch (err) {
    console.error(err);
    return json({ error: 'Internal error' }, 500);
  }
});
