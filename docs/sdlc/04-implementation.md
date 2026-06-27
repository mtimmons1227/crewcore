# Phase 4 — Implementation
**Also known as (AI-era): Build & Integration**
**Status: 🔄 In progress** — Slice 1 (Capture) ✅ DONE; Slice 2 (Onboarding + Command Center) ✅ DONE; Slices 3–5 planned.

## Purpose
Write the code that realizes the design — in vertical slices that each ship usable value.

## Process (repeatable)
1. Build the schema + RLS for the slice.
2. Build the user-facing flow against it.
3. Integrate through secure RPCs, not direct table writes.
4. Apply migrations in order; keep the session log current.

## What we did on CrewCore Recruit

### Slice 1 — Capture ✅ DONE
- **Core schema + RLS + DBOA seed** applied via Supabase migrations:
  - `20260618212707_slice1_recruit_core_schema.sql`
  - `20260618213000_add_chapter_slug.sql`
  - `20260619053500_add_chapter_display_fields.sql`
  - `20260619121500_add_person_auth_user_id_and_recruiter_rls.sql`
  - `20260619201720_lockdown_internal_rls_helper_functions.sql`
- **Public lead-capture form** built in `apps/web` (Vite + React + TypeScript), submitting through `public.submit_lead`. Live tables: `sport`, `association`, `chapter`, `person`, `membership`, `lead`. Public SELECT only on `sport`/`association`/`chapter`; `person`/`membership`/`lead` locked down.

### Slice 2 — Onboarding & Command Center ✅ DONE
- **Recruiter Command Center** (`/command`): authenticated pipeline view with search, status filter, stalled detection (14-day threshold), dropout funnel metrics.
- **Roster detail panel:** chevron-toggled two-column in-place expansion per row — recruit info (name, member type badge, email, phone, started date, current step, clearance level) + step checklist (check/ready/locked states, completion dates, "Completed X · Ready Y · Locked Z" summary).
- **Tailwind/EarnedHome restyle:** full slate-900/white/slate-50 design language across the Command Center.
- **Recruit status page** (`/r/:token`): magic-link-driven onboarding timeline with inline assessment score input (70+ pass threshold).
- **Schema (applied to live DB, migrations in `supabase/migrations/`):**
  - `registration_cycle` — per-recruit onboarding cycle with `member_type`, `status`, `clearance_level`.
  - `step_completion` — per-cycle step status (`locked`, `available`, `in_progress`, `complete`).
  - `registration_step` — configurable step definitions.
  - `magic_link_token` — secure token for the public recruit status page.
  - `workflow_step.authority` — added to the live `workflow_step` table (not yet tracked by a repo migration — add before next DB change).
- **Live DB state:** 8-step DBOA workflow, 6 recruits (2 real + 4 sample), all migrations applied.

### Next: Slice 3 — Compliance
Compliance rollup and division-rep distribution view. Confirm exact scope with DBOA before building. Decision needed first: **monetization model** (see `docs/strategy/competitive-brief.md`).

### Remaining slices (planned)
- **Slice 3 — Compliance:** compliance rollup, division-rep distribution view.
- **Slice 4 — AI:** lead scoring, drop-off prediction, shortage-zone targeting.
- **Slice 5 — Chapter admin config:** workflow builder; NTBOA and FWBOA onboarding via configuration.

### Stack & conventions
Frontend `apps/web` (Vite/React/TS); Supabase Postgres + Auth + RLS; `services/api` for backend, `packages/shared` for shared types. Per `CLAUDE.md`: product docs in `/docs/product`, architecture in `/docs/architecture`, decisions in `/docs/decisions`, prompts in `/docs/prompts`.

## AI's role in this phase
**Maturity: AI-Assisted (LLM copilot).** AI generated the migration SQL, the security-definer capture function, and the React lead-capture UI, working slice by slice. The human reviewed each migration and approved the RLS posture before it was applied.

## Key artifacts
- `supabase/migrations/*.sql`, `apps/web/src/*`.
- [`../CrewCore-Recruit-Implementation-Plan.md`](../CrewCore-Recruit-Implementation-Plan.md) — the slice plan.
- [`../SESSION-LOG.md`](../SESSION-LOG.md) — **running handoff log** (read first when resuming).
- [`../CrewCore-Recruit-SESSION-LOG.md`](../CrewCore-Recruit-SESSION-LOG.md) — historical Slice 1 status notes.
- [`../CrewCore-Deferred-Design-Register.md`](../CrewCore-Deferred-Design-Register.md) — deferred design decisions.
- [`../RUNBOOK.md`](../RUNBOOK.md). See the [artifact index](../artifacts/README.md).
