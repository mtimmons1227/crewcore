# CrewCore

CrewCore is the operating system for sports officials.

## Product mission
CrewCore is a chapter-controlled officiating ecosystem designed to recruit, develop, assign, support, and retain sports officials while preserving chapter autonomy.

## Initial market
Dallas-area high school basketball chapters: DBOA (first customer), NTBOA, FWBOA.

## Core design principles
- Preserve chapter sovereignty
- Build simple workflows with innovative outcomes
- Use AI only where it adds practical value
- Design for chapters and assigners first
- Start as an overlay ecosystem, not a forced replacement of existing systems
- Prefer measurable workflow improvements over abstract features
- Keep products operationally simple and politically realistic

## Current build status (as of 2026-07-28)

**Slices 1, 2 & early Slice 3 — SHIPPED**

Nine React pages in `apps/web/src/pages/`:
- `LeadCapturePage.tsx` (`/`) — public lead-capture form → `submit_lead` RPC + Resend webhook notification
- `RecruitMenuPage.tsx` (`/r/:token`) — magic-link recruit timeline: vertical progress meter, fees strip, Make the Call entry card, placement-confirmed gate, demo THSBOA banner, attendance session toggles
- `CommandCenterPage.tsx` (`/command`) — staff login (passcode `dboa2026`) + recruit roster with expand-detail panel and board smart signals
- `BoardDashboardPage.tsx` (`/board`) — board-level dashboard (passcode-gated)
- `BoardVerifyPage.tsx` (`/board/verify`) — board verify tool: A1 step-verification queue, A2 book issuance (Rulebook / Mechanics Manual), A3 outstanding-books list
- `MakeTheCallPage.tsx` (`/r/:token/make-the-call`) — chapter placement router v2: two-path entry (guided vs compare), 12 questions in 3 named groups (The Situation / The Facts / The Call), desktop two-column layout, "Why we ask" panel, chapter directory, `confirm_placement` handshake
- `CheckInPage.tsx` (`/checkin/:sessionId`) — recruit self-check-in kiosk flow
- `KioskPage.tsx` (`/kiosk/:sessionId`) — staff-facing kiosk attendance display
- `SessionAdminPage.tsx` (`/sessions/admin`) — session creation and management

**App theme:** EarnedHome-inspired. Dark slate-900 header (`rounded-panel`), white `Card` surfaces, slate text hierarchy, soft shadows. Theme tokens live in `tailwind.config.js`.

**DBOA workflow — 11 steps** (live in DB, seeded in `supabase/seed.sql`):
1. Chapter application & dues — `payment`, `staff_verify`, chapter authority, due 7 days
2. THSBOA state registration & dues — `external_confirm`, `self_report`, state authority
3. Background check & abuse-prevention training — `credential`, `self_report`, state
4. DBOA new officials training — `attendance`, `staff_verify`, chapter (new members only)
5. Purchase uniform — `payment`, `staff_verify`, chapter (new/transfer members only)
6. Attend 6 general session meetings — `attendance`, `staff_verify`, chapter, count_required=6
7. Receive NFHS Rulebook & Case Book — `acknowledgment`, `self_report`, state
8. Receive NFHS Mechanics Manual — `acknowledgment`, `self_report`, state
9. THSBOA state test — `assessment`, `self_report`, state (thresholds 70% regular / 90% playoff)
10. DBOA training camp — `attendance`, `staff_verify`, chapter, fee=$75
11. Required off-season training — `attendance`, `staff_verify`, chapter (new/2nd-yr/Div IV-V)

Prerequisite graph: step 2 requires 1; steps 3, 4, 6, 8 require 2; step 7 requires 3; step 9 requires 8.

**Member-type audience:** each step has an `audience.member_types` array (migration 013). Steps with null/empty audience apply to everyone. `start_registration` (migration 014) instantiates only the steps the member_type qualifies for.

**Governing bodies:** `governing_body` table seeded with THSBOA (Arbiter integration) and TASO (IntraFocus). DBOA chapter is linked to THSBOA. `registration_cycle.governing_body_id` tracks which body governs each cycle.

**Stalled / deadline logic:**
- "Stalled" means: `step_completion.due_at < now()` AND `status != 'complete'` for any step in the cycle.
- Deadline policy: chapter dues (step 1) auto-set `due_at = created_at + 7 days`. All other steps are deadline-free until chapter explicitly schedules them.

**Placement gate:**
- `registration_cycle.placement_confirmed` (boolean, default false). Set true by `confirm_placement(token, chapter_id)` when recruit completes Make the Call and clicks "Continue with {chapter}".
- RecruitMenuPage locks all checklist steps + actions while `placement_confirmed === false`, showing Make the Call card as the one thing to do.
- Gate is frontend-enforced; server-side write guards to be added at go-live.

**Arbiter import (migration 010/011):**
- `arbiter_import_official` RPC accepts registration data from ArbiterSports webhook (`x-arbiter-secret` header required).
- On match, auto-completes THSBOA registration step (step 2) and background check (step 3) — eliminates manual self-report for state-authority steps.

**Clearance engine:** trigger auto-computes `clearance_level` from THSBOA state test score: ≥70% = regular, ≥90% = playoff.

**Demo mode:** `demo_load_thsboa(p_token)` RPC marks state-authority steps (2, 3, 9) complete for demo purposes. RecruitMenuPage shows an amber "Demo mode" banner and "Load state steps" button when any state step is incomplete.

**Data:** 1 chapter (DBOA, id `14844f0c-5672-40c6-ae4e-0ec1b8a10679`), 1 sport (Basketball), 1 season (2026-27), 11 workflow steps. Real recruits Aaron Hill and Marvin Timmons. Two demo recruits (Jordan Sample, Riley Stalled) exist in the live DB — **remove after board demo.**

**Key RPCs (Supabase SECURITY DEFINER):**
- `submit_lead`, `start_registration`, `get_registration` — lead/recruit flow
- `save_placement_profile`, `recommend_chapter`, `confirm_placement` — placement router
- `list_chapters_directory`, `create_referral`, `request_chapter_review` — chapter routing
- `list_verify_queue`, `staff_verify_step`, `issue_book`, `outstanding_books` — board verify
- `arbiter_import_official` — Arbiter webhook auto-complete
- `demo_load_thsboa` — demo helper

---

## Scoped but not yet built

**Slice 3 — Stripe dues automation** (`docs/product/slice3-stripe-dues-scope.md`):
Recruit pays chapter dues via Stripe Checkout → webhook → Supabase Edge Function → auto-completes the chapter-dues step_completion row. Gated on board demo. Requires `mark_step_paid` SECURITY DEFINER RPC and a funds-flow decision (chapter's own Stripe account vs. Connect). Stripe is in **test mode** — card `4242 4242 4242 4242`.

**NTBOA / FWBOA expansion:**
Requires the workflow builder (Slice 5) to configure chapter-specific steps and a chapter admin role. No scope doc yet.

**Assigner hand-off (Slice 6):**
Push cleared officials to RefTown/Arbiter. No scope doc yet.

**Returning-official renewals (Slice 7):**
Renewal workflow for returning members. No scope doc yet.

**Mentor pairing + referral loop (Slice 8):**
No scope doc yet.

**AI features (Slice 4):**
Designed to include lead scoring, drop-off prediction, campaign drafting, and readiness summaries. None are built yet.

---

## Slice roadmap
1. ✅ Lead capture + Command Center
2. ✅ Registration / clearance + recruit timeline + roster detail panel
3. ⬜ Stripe dues auto-payment — **next, gated on board demo**
4. ⬜ AI: lead scoring, drop-off prediction, campaign drafting, readiness summaries
5. ⬜ Workflow builder (chapter admin config — enables NTBOA/FWBOA onboarding)
6. ⬜ Assigner hand-off (push cleared official to RefTown/Arbiter)
7. ⬜ Returning-official renewals
8. ⬜ Mentor pairing + referral loop

Built outside the slice roadmap (operational tools):
- ✅ Board verify tool (step-verification queue + book issuance)
- ✅ Make the Call placement router (chapter fit wizard)
- ✅ Attendance engine (kiosk check-in + session admin)
- ✅ Arbiter import (auto-complete state steps from ArbiterSports)

---

## Repo layout

```
apps/web/          — Vite + React + TypeScript + Tailwind frontend
  src/pages/       — 9 pages (see build status above)
  src/components/  — ui/ (Card, shared components)
  src/lib/         — domainEvents, supabaseClient
docs/              — all product and architecture documentation
  product/         — blueprints, user flows, slice scope docs
  architecture/    — data model, UI architecture docs
  decisions/       — ADRs
  sdlc/            — 8-phase SDLC docs
  strategy/        — competitive brief
  sales/           — one-pager, founding agreement
  archive/         — legacy planning files (.docx, .xlsx)
supabase/
  migrations/      — 14 ordered schema migrations (000–014)
  seed.sql         — DBOA 11-step workflow seed (fresh builds only — never run against live DB)
packages/shared/   — EMPTY placeholder
services/api/      — EMPTY placeholder
Website/           — 4 standalone SVG marketing assets (not used by the app)
```

**`services/api/` and `packages/shared/`** are empty placeholders. The project uses Supabase directly.

**`Website/`** contains 4 SVG files (marketing concepts). Not imported by the app. Flag before removing.

---

## Go-live blockers (security)
- Replace passcode `dboa2026` with real staff auth before go-live.
- `start_registration` returns token to the browser — acceptable for demo/test; bind to session or require emailed link before real recruit data.
- Remove demo recruits (Jordan Sample, Riley Stalled) from live DB.
- Rotate Resend API key; flip Stripe test → live; add DMARC for `rparryfinancial.com`.
- `x-arbiter-secret` and all API keys are server-side secrets — never put in browser or docs.

---

## Key reference docs
- `docs/CrewCore-MASTER-BRIEF.md` — deep self-contained handoff (read in a web chat session)
- `docs/sdlc/08-future-releases.md` — full claims ledger and pending catch-up work
- `docs/product/slice3-stripe-dues-scope.md` — Stripe scope doc
- `docs/decisions/ADR-001-shared-multitenant-identity.md` — placeholder, needs real ADR text

---

## Workflow order for new modules
1. Product blueprint → 2. User flow → 3. Data model / schema → 4. UI architecture → 5. AI feature design → 6. Campaign / automation → 7. PRD → 8. Implementation plan → 9. Code

## Coding rules
- No hardcoded values; use env vars for secrets and config
- Loosely coupled modules; multi-tenant chapter support in the data layer
- No over-engineering; favor readable, practical implementations
- Validation and error handling at system boundaries only
- Default to no comments; only add when the WHY is non-obvious

## Output rules for Codex
- Read this file before making major decisions
- Summarize the plan before coding or touching multiple files
- Write design outputs into markdown files under /docs
- Treat previous approved docs as source of truth
- Claims integrity: say "designed to use AI for…" not "uses AI" until a feature is shipped
---

## 2026-08-03 — SESSION UPDATE (resume from here)

*Full narrative + all deliverables live in OneDrive `AI Project\RefNet` (esp. `RefNet_Officiating_Ecosystem_Context.md`). This section is the latest state; read it first when resuming.*

**Repo is now synced with the live database.** Commit `63fdc15` on `main` added every migration that previously existed only in the live DB — `refnet_015`→`027` plus the attendance engine and the simulation helpers (`supabase/migrations/`). Repo now matches the deployed app + DB schema. Caveat: the OLDEST migration filenames diverge from the DB's early history — a one-time `supabase db pull` re-baseline is the someday cleanup (not blocking).

**Modules (RefNet = umbrella platform):**
- **CrewCore Pathway** — the next-generation REPLACEMENT for the CrewCore recruit/onboarding module; will supersede it as the front door. In development. (Live recruit page already brands as "CrewCore Pathway".)
- **CRISP** — browser mechanics-practice tool; grades hand signals via phone/laptop camera (Google MediaPipe, on-device, 7 signals). Integrates with CrewCore via TWO RPCs on a "Signal Practice" step; sends NUMBERS ONLY (reps/seconds/scores), never video. Deployed separately. Engine works; thresholds calibrating.
- **StripeUp** — assigner/staffing operations platform (publish games/time blocks, officials self-schedule via invite link, confirmations, payouts, reporting). In development.
- **HoopMind** — rules/knowledge intelligence engine (~85% built).
- **Basketball Jeopardy** — gamified rules-knowledge trainer (concept).

**Concepts designed (recorded, not built):** AI communication "4th co-official" ecosystem (passive communication profile, AI advisor for game situations, content library, CONSENTED trait feed to assigner; framing "designed to use AI to coach", never "judges"); Collective pregame "Crew Brief" (Venue Card, gets smarter each game; GUARDRAIL: environmental/game-management context only, never player/coach reputational labels); Officials Passport + year-over-year achievement; gamified training; physical readiness/injury-prevention/recovery/longevity program (Anna-led).

**Staging test environment:** `https://staging--refnet-dboa.netlify.app` (branch `staging`), `VITE_SIMULATION_MODE=true` shows simulator panels. Sim RPCs: `sim_mark_paid`, `sim_complete_step`, `demo_load_thsboa` (token-callable — GO-LIVE must remove/gate; staging shares prod DB). Tester manual: `CrewCore_Pathway_Staging_Test_Manual.docx` (OneDrive). Routes: `/`, `/r/:token`, `/r/:token/make-the-call`, `/command`, `/board`, `/board/verify`, `/sessions/admin`, `/kiosk/:id`, `/checkin/:id`, `/sessions/:id/attendance`.

**People & legal — Dr. Anna Loveless:** licensed physical therapist AND active basketball official; Product/Testing Lead + intended Readiness/Wellness Lead. EXPLORATORY collaboration — NOTHING SIGNED yet. Draft agreements (OneDrive, plain-language, attorney-review): Mutual NDA; Exploratory Collaboration & Mutual Confidentiality Agreement + Exhibit A Project Addendum; Thursday discussion guide (+ private prep notes).

**Founder record:** `Founder_Concept_Memorandum.docx` (v3, OneDrive) — records prior conception of CrewCore + all modules + readiness concept + future-enhancement design. Dated day-written (NOT backdated); timeline via Appendix A evidence.

**Marketing (OneDrive):** `CrewCore_Pathway_DBOA_Brochure.pdf` (6pp, real screenshots); `CrewCore_Pathway_DBOA_OnePager` (.png/.pdf/.html — co-branded, real DBOA logo, real screenshots, real Fox 40 + basketball; also a desktop artifact). Rule: honest messaging only — no invented stats/testimonials until DBOA supplies real numbers.

**Go-live must-fix (pre-launch, unchanged):** remove/gate sim + demo RPCs; replace `dboa2026` with real staff auth; stand up a SEPARATE production database; rotate Resend + Stripe keys and flip Stripe test→live; add DMARC for `rparryfinancial.com`; nonprofit→for-profit related-party review (attorney + CPA).
