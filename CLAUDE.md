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

## Current build status (as of 2026-07-03)

**Slices 1 & 2 — SHIPPED**

Three React pages in `apps/web/src/pages/`:
- `LeadCapturePage.tsx` (`/`) — public lead-capture form → `submit_lead` RPC
- `RecruitMenuPage.tsx` (`/r/:token`) — magic-link recruit timeline with step cards
- `CommandCenterPage.tsx` (`/command`) — staff login + recruit roster with expand-detail panel

**App theme:** EarnedHome-inspired. Dark slate-900 header (`rounded-panel`), white `Card` surfaces, slate text hierarchy, soft shadows. All three pages use this theme — no per-page custom CSS. Theme tokens live in `tailwind.config.js`.

**DBOA workflow — 11 steps** (expanded from original 8, live in DB):
1. Chapter application & dues — `payment`, `staff_verify`, chapter authority, due 7 days
2. THSBOA state registration & dues — `external_confirm`, `self_report`, state authority
3. Background check & abuse-prevention training — `credential`, `self_report`, state
4. DBOA new officials training — `attendance`, `staff_verify`, chapter (new members only)
5. Purchase uniform — `payment`, `staff_verify`, chapter (new members only)
6. Attend 6 general session meetings — `attendance`, `staff_verify`, chapter
7. Receive NFHS Rulebook & Case Book — `acknowledgment`, `self_report`, state
8. Receive NFHS Mechanics Manual — `acknowledgment`, `self_report`, state
9. THSBOA state test — `assessment`, `self_report`, state (thresholds 70% regular / 90% playoff)
10. DBOA training camp — `attendance`, `staff_verify`, chapter
11. Required off-season training — `attendance`, `staff_verify`, chapter (new/2nd-yr/Div IV-V)

Prerequisite graph is wired: step 2 requires step 1; steps 3, 4, 6, 8 require step 2; step 7 requires step 3; step 9 requires step 8.

**Stalled / deadline logic:**
- "Stalled" means: `step_completion.due_at < now()` AND `status != 'complete'` for any step in the cycle.
- Deadline policy: chapter dues (step 1) auto-set `due_at = created_at + 7 days` at registration. All other steps are deadline-free until chapter explicitly schedules them.
- This replaced the old 14-day-inactivity heuristic.

**Command Center detail panel (current):**
- Chevron disclosure icon left of each roster row; click row or chevron to expand.
- Member type badge (New / Returning / Transfer) after the recruit's name in row and detail header.
- Left column "Recruit": name + member type, email, phone, started date, current step, clearance level.
- Right column "Steps": all 11 steps by sort_order; each shows check + date if complete, filled dot + "Ready" teal badge if available/in_progress, empty circle + "Locked" muted badge if locked. Summary line: "Completed X · Ready Y · Locked Z".

**Clearance engine:** trigger auto-computes clearance_level from THSBOA state test score: ≥70% = regular, ≥90% = playoff.

**Data:** 1 chapter (DBOA), 1 sport (Basketball), 1 season (2026-27), 11 workflow steps, real recruits Aaron Hill and Marvin Timmons. Two demo recruits (Jordan Sample, Riley Stalled) exist in the live DB — remove after board demo.

**Pending DB action:** migration `20260628000000_expose_due_at_in_get_registration.sql` is committed to the repo but NOT yet pushed to the live DB. Run `npx supabase db push --project-ref nfcmesyfijtnrsdhypqn` to activate due-date chips on the recruit timeline.

---

## Scoped but not yet built

**Slice 3 — Stripe dues automation** (`docs/product/slice3-stripe-dues-scope.md`):
Recruit pays chapter dues via Stripe Checkout → webhook → Supabase Edge Function → auto-completes the chapter-dues step_completion row (replacing manual staff verification). Gated on board demo. Requires Edge Functions, `mark_step_paid` SECURITY DEFINER RPC, and a funds-flow decision (chapter's own Stripe account vs. Connect).

**Arbiter import** (discussed, not documented):
Import official registration data from ArbiterSports to auto-complete or pre-fill the THSBOA state registration step (step 2), replacing manual self-report. No scope doc in repo yet — write one before building.

**Attendance engine** (discussed, not documented):
Track attendance at general session meetings and DBOA training camp against the required count (step 6 needs 6 meetings; steps 10-11 are attendance). No scope doc in repo yet.

**Book / materials inventory** (discussed, not documented):
Track distribution of NFHS Rulebook, Case Book, and Mechanics Manual (steps 7-8, currently self_report / acknowledgment). No scope doc in repo yet.

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

---

## Repo layout

```
apps/web/          — Vite + React + TypeScript + Tailwind frontend
  src/pages/       — LeadCapturePage, RecruitMenuPage, CommandCenterPage
  src/components/  — ui/ (Card, shared components)
docs/              — all product and architecture documentation
  product/         — blueprints, user flows, slice scope docs
  architecture/    — data model, UI architecture docs
  decisions/       — ADRs
  sdlc/            — 8-phase SDLC docs
  strategy/        — competitive brief
  sales/           — one-pager, founding agreement
  archive/         — legacy planning files (.docx, .xlsx)
supabase/
  migrations/      — ordered schema migrations
  seed.sql         — DBOA 11-step workflow seed (fresh builds only — see warnings)
packages/shared/   — EMPTY placeholder, nothing built here yet
services/api/      — EMPTY placeholder, nothing built here yet
Website/           — 4 standalone SVG marketing assets (not used by the app)
```

**`services/api/` and `packages/shared/`** are empty directory placeholders created in April. The project uses Supabase directly; no separate API service exists. Recommend removing both or confirming they're needed before adding code to either.

**`Website/`** contains 4 SVG files (Assigning.svg, Recruiting.svg, Training.svg, development.svg) that appear to be static marketing concept assets. They are not imported by the app. Flag for user decision before removing.

---

## Key reference docs
- `docs/CrewCore-MASTER-BRIEF.md` — deep self-contained handoff (read this in a web chat session)
- `docs/sdlc/08-future-releases.md` — full claims ledger and pending catch-up work
- `docs/product/slice3-stripe-dues-scope.md` — Stripe scope doc
- `docs/decisions/ADR-001-shared-multitenant-identity.md` — contains a placeholder, needs real ADR text

---

## Workflow order for new modules
1. Product blueprint → 2. User flow → 3. Data model / schema → 4. UI architecture → 5. AI feature design → 6. Campaign / automation → 7. PRD → 8. Implementation plan → 9. Code

## Coding rules
- No hardcoded values; use env vars for secrets and config
- Loosely coupled modules; multi-tenant chapter support in the data layer
- No over-engineering; favor readable, practical implementations
- Validation and error handling at system boundaries only
- Default to no comments; only add when the WHY is non-obvious

## Output rules for Claude
- Read this file before making major decisions
- Summarize the plan before coding or touching multiple files
- Write design outputs into markdown files under /docs
- Treat previous approved docs as source of truth
- Claims integrity: say "designed to use AI for…" not "uses AI" until a feature is shipped
