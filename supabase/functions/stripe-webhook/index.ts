// Handles Stripe webhook events for dues payment confirmation.
//
// Flow: checkout.session.completed → idempotency check → upsert payment →
//   mark_step_paid → insert domain_event(dues.paid) → send receipt email
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY

import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing Stripe-Signature', { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  // Only process completed checkouts
  if (event.type !== 'checkout.session.completed') {
    return new Response('ok', { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};
  const { cycle_id, step_id, chapter_id, person_id, season_id } = meta;

  if (!cycle_id || !step_id || !chapter_id || !person_id) {
    console.error('Missing metadata fields', meta);
    return new Response('Missing metadata', { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Idempotency: skip if already processed
  const { data: existing } = await admin
    .from('webhook_event')
    .select('id')
    .eq('provider', 'stripe')
    .eq('event_id', event.id)
    .maybeSingle();

  if (existing) {
    return new Response('already processed', { status: 200 });
  }

  // Record webhook receipt (before processing — prevents duplicate even if later steps fail)
  await admin.from('webhook_event').insert({
    provider: 'stripe',
    event_id: event.id,
    received_at: new Date().toISOString(),
  });

  const amountTotal = session.amount_total ?? 0;
  const currency = session.currency ?? 'usd';
  const providerRef =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.id;

  // Create payment record
  await admin.from('payment').insert({
    person_id,
    chapter_id,
    season_id: season_id || null,
    type: 'dues',
    amount: amountTotal,
    currency,
    status: 'paid',
    provider: 'stripe',
    provider_ref: providerRef,
    paid_at: new Date().toISOString(),
  });

  // Mark dues step complete (SECURITY DEFINER — bypasses staff_verify restriction)
  const { error: markErr } = await admin.rpc('mark_step_paid', {
    p_cycle_id: cycle_id,
    p_step_id: step_id,
    p_payment: {
      provider: 'stripe',
      session_id: session.id,
      payment_intent: providerRef,
      amount: amountTotal,
      currency,
    },
  });
  if (markErr) {
    console.error('mark_step_paid error:', markErr);
    // Don't return 500 — payment is recorded. Log and investigate.
  }

  // Emit domain event so any registered handler (e.g. Realtime on recruit page) can react
  await admin.from('domain_event').insert({
    event_type: 'dues.paid',
    aggregate_type: 'registration_cycle',
    aggregate_id: cycle_id,
    chapter_id,
    person_id,
    payload: { session_id: session.id, step_id, amount: amountTotal, currency },
  });

  // Send receipt email
  const { data: person } = await admin
    .from('person')
    .select('email, full_name')
    .eq('id', person_id)
    .single();

  if (person?.email) {
    const formatted = `$${(amountTotal / 100).toFixed(2)}`;
    const firstName = person.full_name?.split(' ')[0] ?? 'there';
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'CrewCore <noreply@crewcore.app>',
        to: [person.email],
        subject: `Receipt: DBOA Chapter Dues — ${formatted}`,
        html: `<p>Hi ${firstName},</p>
<p>Payment confirmed: <strong>${formatted}</strong> for DBOA chapter dues. Your registration checklist has been updated automatically.</p>
<p style="color:#6b7280;font-size:12px">If you have questions, contact your chapter administrator.</p>`,
      }),
    });
  }

  // Mark webhook fully processed
  await admin
    .from('webhook_event')
    .update({ processed_at: new Date().toISOString() })
    .eq('provider', 'stripe')
    .eq('event_id', event.id);

  return new Response('ok', { status: 200 });
});
