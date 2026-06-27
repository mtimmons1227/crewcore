# Phase 4 — Implementation
**Also known as (AI-era): Build & Integration**
**Status: 🔄 In progress** — Slice 1 (Capture) is DONE; the Recruiter Command Center is next; Slices 2–5 are planned.

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

### Next: Recruiter Command Center
The authenticated `/command` console for recruiters and chapter admins to manage incoming interest — the immediate next build.

### Remaining slices (planned)
- **Slice 2 — Onboarding:** onboarding steps, lead status tracking, recruit magic-link status page.
- **Slice 3 — Compliance:** compliance rollup, division-rep distribution view.
- **Slice 4 — AI:** lead scoring, drop-off prediction.
- **Slice 5 — Chapter admin config:** workflow builder; NTBOA and FWBOA onboarding via configuration.

### Stack & conventions
Frontend `apps/web` (Vite/React/TS); Supabase Postgres + Auth + RLS; `services/api` for backend, `packages/shared` for shared types. Per `CLAUDE.md`: product docs in `/docs/product`, architecture in `/docs/architecture`, decisions in `/docs/decisions`, prompts in `/docs/prompts`.

## AI's role in this phase
**Maturity: AI-Assisted (LLM copilot).** AI generated the migration SQL, the security-definer capture function, and the React lead-capture UI, working slice by slice. The human reviewed each migration and approved the RLS posture before it was applied.

## Key artifacts
- `supabase/migrations/*.sql`, `apps/web/src/*`.
- [`../CrewCore-Recruit-Implementation-Plan.md`](../CrewCore-Recruit-Implementation-Plan.md) — the slice plan.
- [`../CrewCore-Recruit-SESSION-LOG.md`](../CrewCore-Recruit-SESSION-LOG.md) — running status.
- [`../RUNBOOK.md`](../RUNBOOK.md). See the [artifact index](../artifacts/README.md).
