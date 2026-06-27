# Phase 7 — Maintenance
**Also known as (AI-era): Continuous Operations & Assurance**
**Status: ⏳ Not yet reached** — CrewCore Recruit is still in active build (Slice 1 done). Continuous operations begin once the funnel + Command Center are in production use by a chapter.

## Purpose
Keep the system correct, current, and secure after a chapter is live on it — schema upkeep, monitoring, and steady improvements.

## Process (repeatable)
1. Manage schema changes as ordered migrations.
2. Monitor the capture funnel and recruiter usage.
3. Patch dependencies and fix security/RLS findings.
4. Ship small enhancements through the same slice → migration → deploy path.
5. Keep `CLAUDE.md`, the session log, and the runbook current.

## What we did / plan on CrewCore

Maintenance has not begun — the product is pre-production for its first chapter. The foundations that maintenance will rely on are already in place:
- **Versioned schema** — every change is an ordered Supabase migration, so the database has a clean change history and rollback story.
- **RLS-first** — chapter isolation is enforced at the database, which keeps future changes safe by default.
- **Living docs** — `CLAUDE.md` and the session log are kept current as slices land, and [`../RUNBOOK.md`](../RUNBOOK.md) holds operational steps.

**When this phase begins (at first-chapter go-live):** monitor lead-capture conversion and recruiter activity, keep dependencies patched, review RLS as new reads/writes are added per slice, and onboard new chapters (NTBOA, FWBOA) via configuration rather than code.

## AI's role in this phase
**Maturity: AI-Assisted (planned).** AI will draft migration changes, monitor for anomalies in funnel metrics, and keep the docs current; a human approves every schema/RLS change. *(No maintenance activity to record yet.)*

## Key artifacts
- `supabase/migrations/*` (the change history), [`../RUNBOOK.md`](../RUNBOOK.md), [`../../CLAUDE.md`](../../CLAUDE.md).
- See the [artifact index](../artifacts/README.md).
