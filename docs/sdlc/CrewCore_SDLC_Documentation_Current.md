# CrewCore — SDLC Documentation (Current, Compiled)

**Product:** CrewCore (RefNet officiating ecosystem)
**Owner:** Timmons Sport Technologies
**Status:** Current-state compilation of the eight-phase SDLC set. Supersedes the earlier
`docs/sdlc/00–08` snapshot where they differ; reflects the build as of the latest session
(attendance engine, pluggable-adapter integration model, and the CrewCore Pathway front end).
**Companions:** Architecture & Design Manual, User Manual, Operations & Go-Live Runbook.

---

## 0. How AI is used in this SDLC (integrity note)

AI is used as a design and build accelerator — drafting specs, generating code, and producing
documentation — always under human review. Product claims follow a strict rule: **say "designed
to use AI for…", never "uses AI",** until a feature actually ships. No AI feature in the roadmap
(lead scoring, drop-off prediction, campaign drafting, readiness summaries) is built yet; each is
labeled "designed" until it is.

---

## 1. Planning

**Vision.** CrewCore is the operating system for sports officials — a chapter-controlled
ecosystem that recruits, develops, assigns, supports, and retains officials while preserving
chapter autonomy.

**Strategy.** Start as an **overlay** on the systems chapters already use (ArbiterSports for state
eligibility, RefTown for assignment), not a rip-and-replace. Win the first chapter (DBOA) by
removing real friction — getting officials registered, paid, verified, and cleared — then expand
to NTBOA and FWBOA.

**Guiding principles.** Preserve chapter sovereignty; simple workflows, innovative outcomes; AI
only where it adds practical value; design for chapters and assigners first; measurable workflow
improvements over abstract features; operationally simple and politically realistic.

**Initial market.** Dallas-area high-school basketball chapters — DBOA first.

**Delivery model.** Thin vertical "slices," each shippable and demoable, gated on a board demo
before money and real recruit data are involved.

---

## 2. Analysis

**Problem.** Joining a chapter and becoming a cleared official is a paperwork maze spread across
the chapter, the state body, background-check vendors, training sessions, books, and a test.
Nobody has a single view of where a recruit stands, and chapters move people through by hand.

**Primary users.**

- **Recruits/officials** — need a clear, guided path with no guesswork about what's next.
- **Board members / chapter admins** — need to see who's moving, verify steps, run training
  attendance, and issue books.
- **Assigners** — need cleared officials pushed into their assignment software (future slice).

**Key requirements.**

- One guided checklist per recruit, tailored to member type.
- Automatic completion of state-authority steps from the official system of record (Arbiter),
  with a manual override always available.
- Dues collection in-app.
- Attendance capture for training and meetings.
- Chapter-scoped data and configuration (multi-tenant from the data layer up).

**Constraints.** Chapters are politically autonomous and can't be forced onto a new system;
integrations must be swappable; the product must be safe and simple for volunteer board members.

---

## 3. Design

The full technical design is in the **Architecture & Design Manual**; this is the SDLC-level
summary.

- **Frontend:** a Vite + React + TypeScript single-page app (Tailwind styling), deployed on
  Netlify, that only ever *reflects* state — it never runs an integration.
- **Backend:** Supabase (PostgreSQL 15) with Row-Level Security and SECURITY DEFINER RPCs as the
  authorization boundary; edge functions (Deno) for payments, imports, magic links, and video.
- **Data model:** one `person` with many chapter `memberships`; dues, `registration_cycle`, and
  clearance scoped per chapter; a configurable workflow (`workflow_step` / `step_completion`).
- **Workflow engine:** source-agnostic; knows only "step X complete for official Y."
- **Integration architecture (load-bearing decision):** *pluggable adapters over a stable
  workflow core.* Each completion source (self, payment, attendance, external load, staff) is an
  adapter that records completions through one idempotent, audited seam
  (`record_step_completion`), keyed by stable keys. `governing_body.integration_type` selects the
  external-load adapter, which makes multi-state/multi-body support real without touching the
  engine or UI.
- **Security design:** authorization in the database; all secrets server-side; webhook
  authenticity via signatures/secret headers.

**Design decisions of record:** overlay not replacement; chapter sovereignty; pluggable adapters;
shared multi-tenant identity; frontend reflects / backend integrates; honest AI claims.

---

## 4. Implementation

**Shipped (Slices 1–2 + operational tools):**

- **Lead capture + Command Center** (Slice 1): public interest funnel → `submit_lead`, and a staff
  roster with a detail panel and board smart signals.
- **Registration / clearance + recruit timeline** (Slice 2): the CrewCore Pathway recruit menu
  (progress meter, fees strip, placement gate), the 11-step DBOA workflow live in the database
  with prerequisites and member-type audiences, and the clearance engine (70% regular / 90%
  playoff).
- **Make the Call** placement router (guided vs. compare, 12 questions, chapter directory,
  `confirm_placement`).
- **Board Verify** (step-verification queue, book issuance, outstanding books).
- **Attendance engine** (Session Admin, Kiosk with rotating QR + live counts + close-session,
  Session Attendance, self-check-in).
- **Arbiter import** (edge function + `arbiter_import_official` RPC): completes state dues and
  background check and sets clearance from eligibility; idempotent, audited, `x-arbiter-secret`-
  gated; fed today by a tested Power Automate flow.
- **Repo/DB sync:** the repository now matches the deployed schema (all live migrations committed).

**Correctness fix implemented:** the two Arbiter-confirmed steps were flipped from `self_report`
to `staff_verify`, so recruits can no longer self-attest state dues / background check — only the
import completes them.

**Coding rules in force:** no hardcoded secrets/config (use env vars); loosely coupled, multi-
tenant data layer; no over-engineering; validation/error handling at boundaries; comments only
where the *why* is non-obvious.

---

## 5. Testing

- **Staging environment:** `staging--refnet-dboa.netlify.app` (branch `staging`) with
  `VITE_SIMULATION_MODE=true`, which surfaces simulator panels and RPCs (`sim_mark_paid`,
  `sim_complete_step`, `demo_load_thsboa`) so a tester can walk the full flow without real money or
  a live state feed. A written tester manual accompanies it.
- **Integration testing:** the Arbiter import was verified end-to-end via Power Automate (valid
  call → 200 and steps complete; wrong secret → 401 and no data change; unknown email → graceful
  no-match). Dues payment was verified end-to-end in Stripe test mode with an idempotent webhook.
- **Manual QA:** each screen is exercised on staging; the User Manual doubles as a test script.
- **Known test-vs-prod boundary:** staging currently shares the production database, so simulation
  actions must be treated with care until a separate production database exists (see Deployment /
  Runbook).

**Recommended additions:** automated smoke tests for the critical loop (lead → register → dues →
clear → attendance), idempotency tests on the seam, and RLS policy tests per tenant-scoped table.

---

## 6. Deployment

- **Frontend:** Netlify branch deploys — `main` → production (`refnet-dboa.netlify.app`),
  `staging` → staging. Build base `apps/web`, `npm run build`, publish `dist`, SPA redirect in
  `netlify.toml`. Frontend env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_SIMULATION_MODE`.
- **Backend:** Supabase migrations in `supabase/migrations`; edge functions
  (`arbiter-import`, `create-dues-checkout`, `stripe-webhook`, `request-magic-link`,
  `welcome-video`). Server-side secrets: `x-arbiter-secret`, `RESEND_API_KEY`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`. Never run `seed.sql` against the live
  database.
- **Full detail and the go-live checklist** live in the Operations & Go-Live Runbook.

---

## 7. Maintenance

- **Monitoring:** Supabase API and edge-function logs (confirm a request reached the server and
  its status), Supabase security/performance advisors (run after schema changes), and Netlify
  deploy logs.
- **Support playbooks:** documented in the Runbook — the kiosk "Failed to fetch" network drop,
  payment-banner state, lost recruit links, email deliverability, and late Arbiter records
  (manual override).
- **Data hygiene:** remove demo recruits and demo/sim RPCs before real onboarding; keep migrations
  in version control so the schema is reproducible.
- **Technical debt of note:** converge the remaining direct-completion paths onto the seam;
  populate `stable_key` on all steps; a one-time `supabase db pull` re-baseline of the oldest
  migrations; formalize `ADR-001` (currently a placeholder).

---

## 8. Future releases

**Slice roadmap (planned):**

- **Slice 3 — Stripe dues automation** (next; gated on board demo): Checkout → webhook → edge
  function auto-completes the chapter-dues step.
- **Slice 4 — AI** (designed, not built): lead scoring, drop-off prediction, campaign drafting,
  readiness summaries.
- **Slice 5 — Workflow builder:** chapter-admin configuration of steps; enables NTBOA/FWBOA
  onboarding and a chapter-admin role.
- **Slice 6 — Assigner hand-off:** push cleared officials to RefTown/Arbiter (outbound
  provisioning adapter on the seam; per-membership, so different chapters can use different
  assignment platforms).
- **Slice 7 — Returning-official renewals.**
- **Slice 8 — Mentor pairing + referral loop.**

**Designed concepts recorded (not built):** the AI communication "4th co-official" ecosystem
(consented trait feed, "designed to coach," never "judges"); the collective pregame "Crew Brief"
(Venue Card; guardrail: environmental/game-management context only, never player/coach
reputational labels); Officials Passport + year-over-year achievement; gamified training; and a
physical-readiness / injury-prevention / recovery / longevity program. A **mentor signal** layer
(recruit "request a mentor," veteran "volunteer to mentor" at a configurable tenure gate, board
supply/demand view) is specified as an early, capture-only step toward Slice 8.

**Near-term schema additions (specified, additive):** dual-chapter support (primary-chapter flag,
state-standing record, DOB/legal name for identity matching, per-membership provisioning state)
and the three mentor-signal fields — detailed in the Schema Additions Spec.

---

*End of SDLC Documentation (current compilation).*
