# Slice 3 — Stripe dues automation (SCOPE — not yet built)

Status: scoped 2026-06-28, deferred until after the DBOA board demo.
Purpose: replace manual staff verification of chapter dues with automatic
completion when the recruit pays online. This is also the foundation for the
CrewCore revenue rail (the 10% first-year success fee), captured later.

## Goal
A recruit pays their DBOA chapter dues through CrewCore; on confirmed payment,
the "Chapter application & dues" step auto-completes (no staff action), which
unlocks its dependent steps and advances the recruit — all without anyone in
the chapter manually marking it done.

## Current state (what exists today)
- Step 1 "Chapter application & dues": step_type `payment`, completion_mode
  `staff_verify`, authority `chapter`. Today a staff member confirms it in the
  Command Center. Its config already carries the real pricing array
  (new $125; returning $125→$175 on 2026-04-01; transfer $175) and
  `external_url` https://www.thedboa.com/join, plus `due {type:relative, days:7}`.
- `complete_step(p_token, p_step_id, p_data)` is anon-callable but REJECTS
  staff_verify steps (guardrail). So payment auto-completion must NOT go through
  the public complete_step path — it needs a privileged, server-side path.
- `step_completion.completion_mode` CHECK already allows `auto` — so the dues
  step can switch to `auto` once Stripe is the verifier.
- No Edge Functions exist yet; pg_net / webhooks not yet configured.

## Target flow
1. Recruit clicks "Pay chapter dues" on the recruit page (/r/:token).
2. Frontend calls a Supabase Edge Function `create-dues-checkout` with the
   registration access_token. The function:
   - resolves the cycle + member_type, computes the correct amount from the
     step's config.pricing (respecting the date-based returning tiers),
   - creates a Stripe Checkout Session with that amount,
   - puts `cycle_id` (and step_id) in the session `metadata`,
   - returns the Checkout URL; frontend redirects the recruit to Stripe.
3. Recruit pays on Stripe's hosted page.
4. Stripe sends a `checkout.session.completed` webhook to a second Edge
   Function `stripe-webhook`. That function:
   - verifies the Stripe signature (reject if invalid),
   - is idempotent (Stripe may deliver an event more than once — key off the
     Stripe event id / session id so a repeat doesn't double-apply),
   - looks up the cycle/step from metadata,
   - marks the dues step complete via a SECURITY DEFINER RPC
     (e.g. `mark_step_paid(p_cycle_id, p_step_id, p_payment jsonb)`) run with
     service-role privileges — NOT the public complete_step,
   - stores the Stripe session/payment id on step_completion (evidence_url or
     data jsonb) for audit,
   - lets the existing cascade trigger recompute clearance + unlock dependents.
5. Recruit returns to a success URL on the recruit page; the timeline now shows
   dues complete and the next steps unlocked.

## Components to build
- **Stripe**: account, a product/price (or dynamic amount), test + live keys.
- **Edge Function `create-dues-checkout`**: amount calc from config.pricing +
  member_type + today's date; creates Checkout Session with metadata.
- **Edge Function `stripe-webhook`**: signature verify, idempotency, calls RPC.
- **DB**: SECURITY DEFINER `mark_step_paid(...)` (service-role only) that sets
  the dues step to complete with completed_at + payment evidence; consider
  switching the dues step's completion_mode to `auto`.
- **Frontend**: "Pay dues" button on the dues step (recruit page) → calls
  create-dues-checkout → redirect; success/cancel return handling.
- **Secrets**: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET in Supabase function
  env (never in the client).

## Security / correctness requirements
- Verify the Stripe webhook signature on every event; ignore unsigned/invalid.
- Idempotent webhook handling (dedupe on Stripe event/session id).
- Never expose the Stripe secret key client-side; the publishable key only.
- Server recomputes the amount from config — never trust an amount sent by the
  client.
- Note: DBOA state dues are nonrefundable per config; chapter dues refund policy
  is a chapter decision — out of scope for v1.

## Open decisions (resolve before building)
- **Funds flow**: does the chapter collect into its own Stripe account, or does
  CrewCore collect and remit? CrewCore-collects implies Stripe Connect (more
  complex); chapter's-own-account is simpler for v1. This also determines where
  the 10% success fee is taken.
- **Checkout vs Payment Link vs Connect**: simplest first build is a single
  Stripe account + Checkout Session. Connect is a later step tied to the funds
  decision above.
- **Which payment steps**: v1 = chapter dues only. "Purchase uniform" (also a
  payment step) could follow the same pattern later. State dues stay external
  (paid on ArbiterSports), so they remain self_report.

## Tie-ins
- Completing dues via Stripe satisfies the 7-day dues deadline automatically and
  flips the recruit out of any "stalled" state.
- This is the rail that later carries the CrewCore 10% first-year success fee
  (billing automation), per the pricing model in MASTER-BRIEF §7.

## Out of scope for Slice 3
- The 10% success-fee billing automation (separate, later).
- Uniform payment, refunds, Connect multi-account payouts, invoicing.

## Build-time note
Verify the current Stripe Checkout + webhook API and Supabase Edge Function
patterns against live docs (stripe.com/docs, supabase.com/docs/guides/functions)
before implementing — both evolve. This doc is the scope/decisions, not a
copy-paste implementation.
