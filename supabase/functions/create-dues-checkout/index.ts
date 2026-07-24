// Creates a Stripe Checkout session for chapter dues.
// Called by RecruitMenuPage when recruit clicks Pay on a payment step.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   STRIPE_SECRET_KEY, STRIPE_CHAPTER_ACCOUNT_ID, APP_URL

import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const CHAPTER_ACCOUNT = Deno.env.get('STRIPE_CHAPTER_ACCOUNT_ID')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

// DBOA dues in cents by member_type (from docs/sdlc/08-future-releases.md)
const DUES: Record<string, number> = { new: 12500, returning: 17500, transfer: 17500 };
const CREWCORE_FEE_PCT = 0.1; // 10% application fee

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
    const { token, step_id } = await req.json();
    if (!token || !step_id) return json({ error: 'Missing token or step_id' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Verify token and get cycle details
    const { data: cycle, error: cycleErr } = await admin
      .from('registration_cycle')
      .select('id, person_id, chapter_id, member_type, season_id')
      .eq('access_token', token)
      .single();
    if (cycleErr || !cycle) return json({ error: 'Invalid registration token' }, 400);

    // Verify the requested step is available for this cycle
    const { data: completion, error: compErr } = await admin
      .from('step_completion')
      .select('id')
      .eq('cycle_id', cycle.id)
      .eq('workflow_step_id', step_id)
      .eq('status', 'available')
      .single();
    if (compErr || !completion) return json({ error: 'Step not available for payment' }, 400);

    const amountCents = DUES[cycle.member_type ?? 'new'] ?? 12500;
    const feeCents = Math.round(amountCents * CREWCORE_FEE_PCT);
    const memberLabel = cycle.member_type ?? 'new';

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: amountCents,
              product_data: {
                name: 'DBOA Chapter Dues',
                description: `${memberLabel.charAt(0).toUpperCase() + memberLabel.slice(1)} member dues`,
              },
            },
          },
        ],
        success_url: `${APP_URL}/r/${token}?payment=success`,
        cancel_url: `${APP_URL}/r/${token}`,
        metadata: {
          cycle_id: cycle.id,
          step_id,
          chapter_id: cycle.chapter_id,
          person_id: cycle.person_id,
          season_id: cycle.season_id ?? '',
        },
        application_fee_amount: feeCents,
      },
      { stripeAccount: CHAPTER_ACCOUNT },
    );

    return json({ url: session.url });
  } catch (err) {
    console.error(err);
    return json({ error: 'Internal error' }, 500);
  }
});
