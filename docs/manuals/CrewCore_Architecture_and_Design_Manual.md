# CrewCore — Architecture & Design Manual

**Product:** CrewCore (a module of the RefNet officiating ecosystem)
**Owner:** Timmons Sport Technologies
**Status:** Living document — reflects the system as built and deployed
**Audience:** Engineers, technical reviewers, collaborators, and future maintainers

---

## 1. Purpose of this document

This manual is the authoritative technical description of CrewCore: what it is, how it is
built, how the pieces fit together, and the design decisions behind them. It is written so a
new engineer, a technical collaborator (for example, a due-diligence reviewer), or a future
maintainer can understand the system without reading the source line by line. It is a companion
to the CrewCore **User Manual** (how to operate the app), the **SDLC documentation set**
(`docs/sdlc/`), and the **Operations & Go-Live Runbook** (deployment and incident handling).

Everything here is grounded in the current repository and the deployed database. Where a
capability is designed but not yet built, it is labeled as such.

---

## 2. Product overview

CrewCore is **the operating system for sports officials** — a chapter-controlled ecosystem
designed to recruit, develop, assign, support, and retain officials while preserving each
chapter's autonomy.

**Initial market:** Dallas-area high-school basketball chapters — DBOA (first customer), with
NTBOA and FWBOA next.

### Core design principles

- Preserve chapter sovereignty.
- Build simple workflows with innovative outcomes.
- Use AI only where it adds practical value.
- Design for chapters and assigners first.
- Start as an overlay ecosystem, not a forced replacement of existing systems.
- Prefer measurable workflow improvements over abstract features.
- Keep products operationally simple and politically realistic.

### CrewCore within the RefNet ecosystem

RefNet is the umbrella platform. CrewCore is its recruiting/onboarding/clearance module. The
wider ecosystem also includes:

- **CrewCore Pathway** — the next-generation replacement for the CrewCore recruit/onboarding
  front door (in development; the live recruit page already brands as "CrewCore Pathway").
- **CRISP** — a browser mechanics-practice tool that grades officiating hand signals via the
  device camera (on-device; sends numbers only — reps/seconds/scores — never video).
- **StripeUp** — an assigner/staffing operations platform (publish games, officials
  self-schedule, confirmations, payouts, reporting). In development.
- **HoopMind** — a rules/knowledge intelligence engine (~85% built).
- **Basketball Jeopardy** — a gamified rules-knowledge trainer (concept).

This manual focuses on CrewCore. The integration seam (Section 8) is what lets these modules and
outside systems interoperate without entangling their codebases.

---

## 3. Technology stack

Verified against the repository configuration.

### Frontend (`apps/web`, package `crewcore-recruit-web`)

- **React 18.3** with **React Router 6.17** (client-side routing; single-page app).
- **TypeScript 5.6**, bundled by **Vite 5.4** (`build` = `tsc && vite build`).
- **Tailwind CSS 3.4** with PostCSS and autoprefixer; theme tokens in `tailwind.config.js`
  (EarnedHome-inspired: dark slate-900 header, white card surfaces, soft shadows).
- **@supabase/supabase-js 2.34** as the data client.
- **qrcode 1.5** for generating attendance QR codes.

### Hosting / CI

- **Netlify.** Build base `apps/web`, command `npm run build`, publish `dist`. A catch-all
  redirect (`/* → /index.html`, status 200) serves the SPA so deep links like `/board` and
  `/r/:token` survive direct open and refresh.
- **Production** builds from `main` → `refnet-dboa.netlify.app`.
- **Staging** builds from the `staging` branch → `staging--refnet-dboa.netlify.app`, with
  `VITE_SIMULATION_MODE=true` to surface simulator panels for testing.

### Backend (Supabase)

- **PostgreSQL 15** with **Row-Level Security** and **SECURITY DEFINER** stored procedures
  (RPCs) as the primary access pattern.
- **pg_net** for outbound HTTP from the database.
- **Auth** via email magic-link.
- **Storage** bucket configured (50 MiB file-size limit).

### Edge Functions (Supabase, Deno runtime, TypeScript)

- `arbiter-import` — inbound ArbiterSports roster adapter.
- `create-dues-checkout` — creates a Stripe Checkout session for chapter dues.
- `stripe-webhook` — receives Stripe events; runs with `verify_jwt=false` because it
  authenticates on the Stripe signature header, not a Supabase JWT.
- `request-magic-link` — issues the recruit/staff magic link.
- `welcome-video` — serves/records the welcome-video step.

Deno import map pins `@supabase/supabase-js@2` and `stripe@14`.

### Payments & email

- **Stripe** (`stripe@14`) — currently in **test mode** (test card `4242 4242 4242 4242`).
- **Resend** — transactional email (lead notifications, magic links).

### Languages

TypeScript end-to-end (frontend and edge functions); SQL for the database layer.

---

## 4. Application architecture (frontend)

CrewCore is a single-page React application. `App.tsx` mounts a React Router `Routes` table,
wraps the tree in an **ErrorBoundary** (renders a friendly "Something went wrong — please
refresh" panel on uncaught errors), and starts a **domain-event consumer** on mount
(`startDomainEventConsumer` / `stopDomainEventConsumer`) that processes the `domain_event`
outbox. Layout is route-aware: some screens render full-bleed (kiosk, check-in, session admin,
attendance, board verify, make-the-call), while others use a centered framed shell.

### Route / screen map (as built)

| Route | Screen | Purpose | Access |
|---|---|---|---|
| `/` | Lead Capture | Public recruit lead-capture funnel → `submit_lead` | Public |
| `/r/:token` | Recruit Menu (CrewCore Pathway) | Magic-link recruit timeline: progress meter, fees strip, Make-the-Call entry, placement gate, attendance toggles | Tokenized link |
| `/r/:token/make-the-call` | Make the Call | Chapter placement router: guided vs. compare, 12 questions in 3 groups, chapter directory, `confirm_placement` | Tokenized link |
| `/command` | Command Center | Staff recruit roster with detail panel and board smart signals | Passcode (`dboa2026`, demo) |
| `/board` | Board Dashboard | Board-level dashboard (recruit progress, PII) | Passcode-gated (demo) |
| `/board/verify` | Board Verify | Step-verification queue, book issuance (Rulebook / Mechanics Manual), outstanding-books list | Passcode-gated (demo) |
| `/sessions/admin` | Session Admin | Create and manage training sessions | Passcode (`dboa2026`, demo) |
| `/sessions/:sessionId/attendance` | Session Attendance | Per-session attendance detail | Passcode-gated (demo) |
| `/kiosk/:sessionId` | Kiosk | Staff-facing attendance display: rotating QR, live counts, check-in/out mode, close-session | Passcode (`dboa2026`, demo) |
| `/checkin/:sessionId` | Check-In | Recruit self-check-in flow (QR target) | Tokenized |

**Note on access control:** the passcode `dboa2026` and tokenized links are **demo-grade**. Real
staff authentication and server-side write guards are go-live items (see the Runbook).

### Client data access

The frontend talks to Supabase exclusively through the `supabase` client
(`supabaseClient.ts`), which throws at startup if `VITE_SUPABASE_URL` or
`VITE_SUPABASE_ANON_KEY` are missing. Screens call SECURITY DEFINER RPCs (e.g.
`get_registration`, `get_session_code`, `close_session`) rather than querying tables directly;
this keeps authorization logic in the database and the anon key minimally privileged. **The
frontend only ever reflects state — it never runs an integration.**

---

## 5. Backend architecture (Supabase)

The database is the system of record and the authorization boundary.

- **Access pattern:** clients call **SECURITY DEFINER RPCs**. Each RPC encapsulates its own
  authorization and business rules and runs with the definer's privileges, so the browser never
  needs broad table grants.
- **Row-Level Security** is the deny-by-default backstop on tables.
- **Idempotency & audit:** completions are recorded with source, evidence, actor, and timestamp
  (Section 8), and step completion is idempotent — re-calling never double-completes.
- **Outbox pattern:** `domain_event` is an event outbox drained by the frontend's domain-event
  consumer (and suited to server-side workers later), decoupling side effects (e.g.
  notifications) from the transaction that produced them.
- **Outbound HTTP:** `pg_net` lets the database call out (e.g. to trigger a Resend notification)
  without a separate worker.
- **Auth:** email magic-link; `stripe-webhook` is exempt from JWT verification by design.

---

## 6. Data model

CrewCore's schema separates a **person** (one human identity) from their **memberships** (their
relationships to chapters), and scopes dues, registration, and clearance per chapter. This is
what makes multi-chapter and multi-body support tractable.

### Core entities

- **person** — one human identity (`full_name`, `email`, `phone`, `home_location`,
  `auth_user_id`). One row per official.
- **membership** — a person's relationship to a chapter (`person_id`, `chapter_id`, `sport_id`,
  `role`, `status`, `division`). Many-to-many: one person can belong to several chapters.
- **chapter** — a local association (DBOA, NTBOA, …) with branding, region, `governing_body_id`,
  `association_id`/`state_association_id`, and routing flags (`is_integrated`,
  `is_routing_active`).
- **association** — grouping above chapters (supports a parent hierarchy).
- **governing_body** — the state/sanctioning body (THSBOA, TASO). Carries
  `integration_type` (`arbiter | intra_focus | none`) — the **adapter selector** — and a
  `config` JSONB bag.
- **sport**, **season** — reference dimensions.
- **registration_cycle** — one official's onboarding cycle for a chapter/sport/season:
  `member_type`, `status`, `clearance_level`, `cleared_at`, `placement_confirmed_at`,
  `welcome_video_watched_at`, `governing_body_id`, `access_token`, `template_version_id`.
- **workflow_template**, **workflow_template_version**, **workflow_step**, **step_dependency** —
  the configurable onboarding workflow (steps, order, prerequisites, audience, config).
- **step_completion** — the per-cycle status of each step, with source/evidence/actor and
  `due_at` for deadline logic.
- **payment** — dues and fees, scoped by `person_id`, `chapter_id`, `season_id`, with `type`,
  `amount`, `status`, `provider`, `provider_ref`, `paid_at`.
- **training_session**, **session_attendance**, **attendance_status_audit** — the attendance
  engine (sessions, check-ins/outs, audit trail).
- **book_issuance** — Rulebook / Mechanics Manual issuance tracking.
- **lead**, **referral_record**, **review_request**, **placement_profile** — the recruiting and
  placement funnel.
- **eligibility_hold** — holds that block clearance/assignment.
- **domain_event**, **webhook_event** — event outbox and inbound webhook log.
- **import_batch**, **import_row** — roster-import staging and idempotency.
- **module**, **chapter_module**, **welcome_video** — module enablement and content.

### Identity & multi-chapter

Because `membership`, `payment`, and `registration_cycle` are all chapter-scoped and hang off a
single `person`, an official who belongs to two chapters is one person with two memberships, two
local-dues payments, and two clearances — and each chapter can route to a *different* assignment
platform via its governing body. Planned additions to fully realize dual-chapter membership (a
primary-chapter flag, a state-standing record, DOB/legal name for identity matching, per-
membership provisioning state, and mentor-signal fields) are specified in the companion
**Schema Additions Spec** and are additive, not a redesign.

---

## 7. The workflow engine

The heart of CrewCore is a **source-agnostic workflow engine**. It knows only "step X is complete
for official Y"; it never names a vendor or a payment method.

### The DBOA workflow (11 steps, live in the database)

1. Chapter application & dues — `payment`, staff-verify, chapter authority, due in 7 days.
2. THSBOA state registration & dues — external-confirm, state authority.
3. Background check & abuse-prevention training — credential, state.
4. DBOA new-officials training — attendance, chapter (new members only).
5. Purchase uniform — payment, chapter (new/transfer only).
6. Attend 6 general session meetings — attendance, chapter (count required = 6).
7. Receive NFHS Rulebook & Case Book — acknowledgment, state.
8. Receive NFHS Mechanics Manual — acknowledgment, state.
9. THSBOA state test — assessment, state (thresholds: 70% regular / 90% playoff).
10. DBOA training camp — attendance, chapter (fee $75).
11. Required off-season training — attendance, chapter (new / 2nd-year / Div IV–V).

**Prerequisite graph:** step 2 requires 1; steps 3, 4, 6, 8 require 2; step 7 requires 3;
step 9 requires 8.

### Supporting rules

- **Member-type audience.** Each step has an `audience.member_types` array. Steps with no
  audience apply to everyone. `start_registration` instantiates only the steps the member type
  qualifies for.
- **Clearance engine.** A trigger computes `clearance_level` from the THSBOA state-test score:
  ≥70% = regular, ≥90% = playoff.
- **Stalled / deadline logic.** "Stalled" = any step with `due_at < now()` and status not
  complete. Chapter dues (step 1) auto-set a 7-day deadline; other steps are deadline-free until
  a chapter schedules them.
- **Placement gate.** `registration_cycle.placement_confirmed` is false until the recruit
  completes Make the Call and confirms a chapter (`confirm_placement`). Until then the recruit
  menu locks all steps and shows Make the Call as the one action. The gate is frontend-enforced
  today; server-side write guards are a go-live item.

---

## 8. Integration architecture — pluggable adapters over a stable core

This is the single most important architectural decision, and the rule to preserve.

### The one rule

**Separate WHAT must happen (the workflow) from HOW it's confirmed (the source).** The workflow
engine is the stable, source-agnostic core. Every completion source is a **pluggable adapter**
that plugs into one standard "record a completion" doorway. You can add, swap, or remove a source
without changing the workflow, the checklist, or the recruit experience.

### Two layers

1. **Stable core (rarely changes):** `workflow_step`, `registration_cycle`, `step_completion`,
   and the cascade (unlock dependents + recompute clearance). It never names a vendor.
2. **Pluggable edge (changes freely):** completion-source adapters, each translating its own
   world into a call to the seam.

### The completion sources (each an adapter)

| Source | Who/what completes the step | DBOA steps |
|---|---|---|
| `self` | the official | uniform, books (demo) |
| `payment` | Stripe webhook | chapter dues |
| `attendance` | a check-in scan | new-official training, general meetings |
| `external_load` | a governing-body import | THSBOA state dues, background, test+score (Arbiter) |
| `staff` | a human confirms | camp, off-season, book issuance |

### The seam (target design)

A single canonical function — `record_step_completion(cycle, step_stable_key, source, evidence,
actor)` — that finds the step by **stable key**, sets completion **idempotently**, records
**source + evidence + actor + timestamp**, and lets the cascade unlock dependents and recompute
clearance. Every adapter calls this; nothing marks a step complete by reaching around it. (Today
a few paths still set status directly — `attendance_recompute`, `demo_load_thsboa`, the payment
path — and are being converged onto the seam; new adapters use the seam from day one.)

### Why it matters — three guarantees

1. **Swap the source, keep everything else.** A state leaving Arbiter, or a new state on
   Intra-Focus, means writing a new adapter that ticks the same stable keys — steps, checklist,
   and recruit experience are untouched.
2. **Idempotent loads.** Re-running an import reconciles to current truth; safe to run nightly,
   pause, or remove.
3. **Manual override always available.** Any step can be completed by its normal source **or** by
   a staff override, so a late or down integration never stalls a recruit.

### Selecting the adapter

`governing_body.integration_type` picks which external-load adapter runs for a body. Adding a
state or body = add a `governing_body` row (and, if new, its adapter). The workflow engine and UI
do not change. This is what makes multi-state / multi-body real.

### First application and the RefTown hand-off

- **Inbound (built):** THSBOA via **Arbiter**. The `arbiter-import` function reads the roster,
  maps fields to stable keys, and records completions for state dues, background, and test+score —
  idempotent and audited. `x-arbiter-secret` gates the webhook.
- **Outbound (designed, Slice 6):** the **RefTown hand-off** — after an official pays local dues
  in CrewCore, provision/activate them in the chapter's assignment software. This is an outbound
  provisioning adapter on the same seam. Because activation is per-membership, DBOA can route to
  RefTown while another chapter routes to Arbiter.

**Anti-patterns to avoid:** hardcoding a vendor name in the engine or UI; letting a step's only
completion path be a single integration; setting `status='complete'` around the seam; mapping an
integration to step UUIDs instead of stable keys.

---

## 9. Edge functions & key RPCs

### Edge functions

- **arbiter-import** — inbound roster adapter (auto-completes state-authority steps).
- **create-dues-checkout** — creates a Stripe Checkout session for chapter dues.
- **stripe-webhook** — handles Stripe events; `verify_jwt=false` (Stripe-signature auth).
- **request-magic-link** — issues recruit/staff magic links.
- **welcome-video** — serves/records the welcome-video step.

### Representative RPCs (SECURITY DEFINER)

- Lead / recruit: `submit_lead`, `start_registration`, `get_registration`.
- Placement: `save_placement_profile`, `recommend_chapter`, `confirm_placement`,
  `list_chapters_directory`, `create_referral`, `request_chapter_review`.
- Board verify: `list_verify_queue`, `staff_verify_step`, `issue_book`, `outstanding_books`.
- Attendance: `get_session_code`, `get_session_attendance_counts`, `close_session` (+ check-in).
- Integrations / demo: `arbiter_import_official`, `demo_load_thsboa`.
- Simulation (staging only): `sim_mark_paid`, `sim_complete_step`, `demo_load_thsboa`.

---

## 10. Security model

- **Authorization in the database.** SECURITY DEFINER RPCs + RLS keep the anon key minimally
  privileged and business rules server-side.
- **Secrets are server-side only.** `x-arbiter-secret`, Resend and Stripe keys live in Supabase
  function secrets — never in the browser or in documents.
- **Webhook authenticity.** `stripe-webhook` verifies the Stripe signature (hence
  `verify_jwt=false`); the Arbiter webhook requires `x-arbiter-secret`.
- **Known demo-grade items (must close before real recruits / real money):** the `dboa2026`
  passcode; the token-callable `demo_load_thsboa` and `sim_*` RPCs; `start_registration`
  returning a token to the browser; board PII behind demo auth; attendance identity via
  localStorage token. These are tracked in the Operations & Go-Live Runbook and the go-live
  checklist.

---

## 11. Key design decisions (ADR summary)

- **Overlay, not replacement.** CrewCore starts as an overlay on the chapter's existing systems
  (Arbiter, RefTown), never a forced rip-and-replace. Adoption risk stays low; the manual
  override guarantees the chapter is never worse off.
- **Chapter sovereignty.** Data and configuration are chapter-scoped; a chapter's rules,
  branding, and workflow are its own.
- **Pluggable adapters over a stable workflow core** (Section 8) — the load-bearing decision.
- **Shared multi-tenant identity.** One `person`, many memberships; dues/clearance per chapter.
  (Formal ADR text is a documentation to-do: `docs/decisions/ADR-001` is a placeholder.)
- **Frontend reflects, backend integrates.** Integrations live entirely in the RefNet backend;
  the frontend never runs one. This keeps integrations reusable across modules and frontends.
- **Honest AI claims.** Say "designed to use AI for…", never "uses AI", until a feature ships.

---

## 12. Roadmap (engineering view)

Shipped: Slice 1 (lead capture + Command Center); Slice 2 (registration/clearance + recruit
timeline + roster detail); plus operational tools — board verify, Make the Call, the attendance
engine, and Arbiter import.

Next / planned:

- Slice 3 — Stripe dues automation (next; gated on board demo).
- Slice 4 — AI: lead scoring, drop-off prediction, campaign drafting, readiness summaries
  (designed, not built).
- Slice 5 — workflow builder (chapter-admin config; enables NTBOA/FWBOA).
- Slice 6 — assigner hand-off (RefTown/Arbiter outbound provisioning).
- Slice 7 — returning-official renewals.
- Slice 8 — mentor pairing + referral loop.

---

## 13. Repository layout

```
apps/web/            Vite + React + TypeScript + Tailwind frontend
  src/pages/         Route screens (see Section 4)
  src/components/    ui/ (Card and shared components)
  src/lib/           domainEvents, supabaseClient
docs/                Product & architecture documentation
  product/           Blueprints, user flows, slice scope docs
  architecture/      Data model, UI architecture
  decisions/         ADRs
  sdlc/              8-phase SDLC docs (00–08)
  strategy/, sales/  Competitive brief, one-pager, founding agreement
  artifacts/         Compiled SDLC Word doc + artifacts index
  archive/           Legacy planning files
supabase/
  migrations/        Ordered schema migrations
  functions/         Edge functions (arbiter-import, create-dues-checkout,
                     stripe-webhook, request-magic-link, welcome-video)
  seed.sql           DBOA 11-step workflow seed (fresh builds only — never against live DB)
```

`packages/shared/` and `services/api/` are empty placeholders; the project uses Supabase
directly. `Website/` holds standalone marketing SVGs not imported by the app.

---

*End of Architecture & Design Manual.*
