# Artifacts & Reference Index
**Where the supporting documents live, organized by SDLC phase.**

CrewCore keeps its working docs under `docs/product`, `docs/architecture`, `docs/decisions`, `docs/strategy`, and `docs/prompts`. This index maps each SDLC phase to those existing files plus the deliverables, rather than copying their content. The SDLC Markdown files in `docs/sdlc/` are the **single source of truth**; Word output is generated from them.

---

## Phase 1 — Planning
- [`../../CLAUDE.md`](../../CLAUDE.md) — mission, principles, modules, build priority, file conventions.
- [`../product/CrewCore Recruit Brief.md`](../product/CrewCore%20Recruit%20Brief.md) — the Recruit module brief.
- [`../product/CrewCore-Recruit-Blueprint.md`](../product/CrewCore-Recruit-Blueprint.md) — full blueprint.
- [`../product/CrewCore-demo.pdf`](../product/CrewCore-demo.pdf) — demo/slide deck.
- [`../strategy/competitive-brief.md`](../strategy/competitive-brief.md) — competitive landscape, positioning, monetization options, strategic risks. **Read before Slice 3 planning.**

## Phase 2 — Analysis
- [`../product/CrewCore-Recruit-User-Flows.md`](../product/CrewCore-Recruit-User-Flows.md) — user flows.
- [`../architecture/CrewCore-Recruit-Data-Model.md`](../architecture/CrewCore-Recruit-Data-Model.md) — data model (primary).
- [`../architecture/Data-Model.md`](../architecture/Data-Model.md) — earlier data model draft (kept for reference; superseded by the above).
- [`../decisions/ADR-001-shared-multitenant-identity.md`](../decisions/ADR-001-shared-multitenant-identity.md) — multi-tenant identity ADR. *Decision text is a placeholder — needs restoring.*

## Phase 3 — Design
- [`../architecture/CrewCore-Recruit-Data-Model.md`](../architecture/CrewCore-Recruit-Data-Model.md) — data model as designed.
- [`../architecture/CrewCore-Recruit-UI-Architecture.md`](../architecture/CrewCore-Recruit-UI-Architecture.md) — UI architecture (primary).
- [`../architecture/UI-Architecture.md`](../architecture/UI-Architecture.md) — earlier UI architecture draft (kept for reference; superseded by the above).
- [`../CrewCore-Deferred-Design-Register.md`](../CrewCore-Deferred-Design-Register.md) — intentionally deferred design decisions (chapter workflow config, assessment gating, magic-link expiry, dropout funnel). Revisit per slice.
- `../../supabase/migrations/*` — schema + RLS as applied to the live database.
- **AI design reference deliverables** (in repo root, not committed to docs/): `CrewCore_AI_Component_Reference_Guide_split_fixed_v2.docx`, `CrewCore_Decision_Owner_Workflow_Reference.docx`.

## Phase 4 — Implementation
- `../../supabase/migrations/*.sql` — all applied migrations (Slice 1 + Slice 2).
- `../../apps/web/src/*` — frontend source (Vite + React + TypeScript).
- [`../CrewCore-Recruit-Implementation-Plan.md`](../CrewCore-Recruit-Implementation-Plan.md) — slice roadmap (primary).
- [`../Implementation-Plan.md`](../Implementation-Plan.md) — earlier implementation plan draft (kept for reference; review for consolidation with the above).
- [`../SESSION-LOG.md`](../SESSION-LOG.md) — **running handoff log** (read first when resuming work). Current record of what shipped, current state, gotchas, and next actions.
- [`../CrewCore-Recruit-SESSION-LOG.md`](../CrewCore-Recruit-SESSION-LOG.md) — historical Slice 1 status notes (superseded by SESSION-LOG.md above; kept for audit trail).
- [`../RUNBOOK.md`](../RUNBOOK.md) — local dev setup, staff onboarding SQL, pre-launch checklist.

## Phase 5 — Testing
- `../../supabase/migrations/*` — RLS policies are the test surface; verified per-slice.
- [`../SESSION-LOG.md`](../SESSION-LOG.md) — session log records what's been verified per slice (end-to-end flows, security advisor results).

## Phase 6 — Deployment
- `../../apps/web/dist/` — production build output.
- `../../apps/web/.env.example` — required env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- [`../RUNBOOK.md`](../RUNBOOK.md) — deployment steps, environment setup, pre-launch hardening checklist.

## Phase 7 — Maintenance
- `../../supabase/migrations/*` — schema change history.
- [`../RUNBOOK.md`](../RUNBOOK.md) — operational gotchas (Supabase pause risk, db reset warning).
- [`../SESSION-LOG.md`](../SESSION-LOG.md) — standing gotchas section tracks live operational risks.
- [`../../CLAUDE.md`](../../CLAUDE.md) — product conventions; keep in sync as the codebase evolves.
- *(Phase not yet active.)*

## Phase 8 — Future Releases
- [`../CrewCore-Recruit-Implementation-Plan.md`](../CrewCore-Recruit-Implementation-Plan.md) — Slices 3–5 and beyond.
- [`../../CLAUDE.md`](../../CLAUDE.md) — ecosystem modules (Exchange, Academy, Payouts, Insights).
- [`../strategy/competitive-brief.md`](../strategy/competitive-brief.md) — monetization options to decide before Slice 3.
- **Positioning deliverable** (in repo root): `CrewCore_AI_Interview_Narrative.docx`.

---

## Sales & board materials

- [`../sales/onepager.md`](../sales/onepager.md) — CrewCore Recruit one-pager (markdown source). PDF: [`../sales/CrewCore_DBOA_OnePager.pdf`](../sales/CrewCore_DBOA_OnePager.pdf).
- [`../sales/founding-agreement.md`](../sales/founding-agreement.md) — DBOA founding-chapter agreement (markdown source). PDF: [`../sales/CrewCore_DBOA_FoundingAgreement.pdf`](../sales/CrewCore_DBOA_FoundingAgreement.pdf).
- `../../supabase/migrations/20260627182800_add_workflow_step_authority.sql` — migration mirror for the `workflow_step.authority` column applied directly to the live DB during Slice 2. Pending: drop the SQL file here to keep the schema tracked.

---

## Compiled deliverable
- [`CrewCore_SDLC_Documentation.docx`](CrewCore_SDLC_Documentation.docx) — the full SDLC narrative (Planning → Future Releases) compiled into one polished Word document, generated from the Markdown in [`../sdlc/`](../sdlc/README.md). Regenerate when the Markdown changes.

---

## Notes on duplicates
- `docs/architecture/Data-Model.md` and `UI-Architecture.md` are earlier drafts superseded by their `CrewCore-Recruit-*` counterparts. They are kept for audit trail but should not be updated going forward.
- `docs/Implementation-Plan.md` may overlap with `docs/CrewCore-Recruit-Implementation-Plan.md`. Consolidate or deprecate in the next doc cleanup pass.
- `StripeUp_AI_Matrix_and_Roadmap.xlsx` (repo root) belongs to the **StripeUp** project — move it to the StripeUp repo when convenient.

---

*If a referenced file moves or is renamed, update this index. The SDLC Markdown is the source of truth; this index is the map.*
