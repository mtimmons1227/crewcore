# Artifacts & Reference Index
**Where the supporting documents live, organized by SDLC phase.**

CrewCore keeps its working docs under `docs/product`, `docs/architecture`, `docs/decisions`, and `docs/prompts`. This index maps each SDLC phase to those existing files plus the deliverables, rather than copying their content.

## Phase 1 — Planning
- [`../../CLAUDE.md`](../../CLAUDE.md) — mission, principles, modules, build priority, conventions.
- [`../product/CrewCore Recruit Brief.md`](../product/CrewCore%20Recruit%20Brief.md), [`../product/CrewCore-Recruit-Blueprint.md`](../product/CrewCore-Recruit-Blueprint.md), [`../product/CrewCore-demo.pdf`](../product/CrewCore-demo.pdf).

## Phase 2 — Analysis
- [`../product/CrewCore-Recruit-User-Flows.md`](../product/CrewCore-Recruit-User-Flows.md).
- [`../architecture/CrewCore-Recruit-Data-Model.md`](../architecture/CrewCore-Recruit-Data-Model.md).
- [`../decisions/ADR-001-shared-multitenant-identity.md`](../decisions/ADR-001-shared-multitenant-identity.md) — *decision text needs restoring (currently a placeholder).* 

## Phase 3 — Design
- [`../architecture/CrewCore-Recruit-Data-Model.md`](../architecture/CrewCore-Recruit-Data-Model.md), [`../architecture/CrewCore-Recruit-UI-Architecture.md`](../architecture/CrewCore-Recruit-UI-Architecture.md).
- `../../supabase/migrations/*` — schema + RLS as applied.
- **AI design reference (deliverables):** `../../CrewCore_AI_Component_Reference_Guide_split_fixed_v2.docx`, `../../CrewCore_Decision_Owner_Workflow_Reference.docx`.

## Phase 4 — Implementation
- `../../supabase/migrations/*.sql`, `../../apps/web/src/*`.
- [`../CrewCore-Recruit-Implementation-Plan.md`](../CrewCore-Recruit-Implementation-Plan.md), [`../CrewCore-Recruit-SESSION-LOG.md`](../CrewCore-Recruit-SESSION-LOG.md), [`../RUNBOOK.md`](../RUNBOOK.md).

## Phase 5 — Testing
- `../../supabase/migrations/*` (RLS under test); session log records what's verified per slice.

## Phase 6 — Deployment
- `../../apps/web/dist/`, `../../apps/web/.env.example`, [`../RUNBOOK.md`](../RUNBOOK.md).

## Phase 7 — Maintenance
- `../../supabase/migrations/*` (change history), [`../RUNBOOK.md`](../RUNBOOK.md), [`../../CLAUDE.md`](../../CLAUDE.md). *(Phase not yet active.)*

## Phase 8 — Future Releases
- [`../CrewCore-Recruit-Implementation-Plan.md`](../CrewCore-Recruit-Implementation-Plan.md) (slice roadmap), [`../../CLAUDE.md`](../../CLAUDE.md) (ecosystem modules).
- **Positioning (deliverable):** `../../CrewCore_AI_Interview_Narrative.docx`.

## Compiled deliverable
- `CrewCore_SDLC_Documentation.docx` — the full SDLC narrative (Planning → Future Releases) compiled into one polished Word document, generated from the Markdown in [`../sdlc/`](../sdlc/README.md). Regenerate when the Markdown changes.

> **Note:** `../../StripeUp_AI_Matrix_and_Roadmap.xlsx` is present in this repo but belongs to the **StripeUp** project — it is not a CrewCore artifact and should be moved to the StripeUp repo.

---
*If a referenced file moves or is renamed, update this index.*
