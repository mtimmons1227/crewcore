# Phase 2 — Analysis
**Also known as (AI-era): Requirements & Feasibility Analysis**
**Status: ✅ Complete (for CrewCore Recruit)**

## Purpose
Gather detailed requirements and analyze them — use cases, the data the system needs, and the technical approach — before design.

## Process (repeatable)
1. Capture use cases per user role.
2. Specify data and workflow requirements.
3. Define success criteria and constraints.
4. Choose the approach and confirm feasibility.

## Part A — Requirements gathering (CrewCore Recruit)

**Core goals.** Increase the recruiting pipeline, improve onboarding conversion, reduce drop-off, route recruits to the correct chapter, and transition recruits into training/assignment readiness.

**Core use cases.**
- A **prospect** lands on a chapter-branded public page and submits interest (the lead-capture funnel).
- A **recruiter/chapter admin** manages incoming interest from a secure Command Center.
- A recruit progresses through onboarding steps with status tracking and a magic-link status page.
- Chapter admins configure chapter-specific recruiting workflows (so NTBOA/FWBOA onboard via configuration, not new code).
- (Later) AI scores leads, predicts drop-off, recommends chapter routing, drafts campaigns, and summarizes readiness.

**Data/workflow requirements.** The module follows a fixed design order: blueprint → user flow → data model → UI architecture → AI design → automation → PRD → implementation plan → code. The data model centers on `sport`, `association`, `chapter` (with branding/slug/display fields), `person` (with `auth_user_id`), `membership` (role + status), and `lead`. The public page must **not** write directly to `person`/`lead` — it submits through a security-definer RPC.

**Success criteria.** A working chapter-branded capture funnel; recruiter visibility into leads; multi-tenant isolation by chapter via RLS; configurable per-chapter workflows; routing to the correct chapter.

**Constraints.** Preserve chapter sovereignty; politically realistic; operationally simple; AI only where it adds practical value; overlay (don't replace existing chapter systems).

## Part B — Feasibility & approach analysis

### Key decisions
- **Federated, multi-tenant identity.** A shared identity/membership model across chapters with chapter-scoped access — the subject of `docs/decisions/ADR-001` (shared multi-tenant identity). *(Note: the ADR file currently holds only a placeholder command and needs its decision text restored — flagged in Future Releases.)*
- **Security-definer lead capture.** The public app submits via a `public.submit_lead` RPC rather than writing tables directly, so the public page never needs write access to `person`/`lead`.
- **Slice-based delivery.** Build in vertical slices (Capture → Onboarding → Compliance → AI → Chapter admin config) so value ships incrementally.
- **Config-driven chapters.** New chapters (NTBOA, FWBOA) onboard through configuration rather than bespoke builds.

### Feasibility
Confirmed by Slice 1 shipping: the core schema with RLS, a DBOA seed, and a working public lead-capture form, with `person`/`membership`/`lead` locked down (no public SELECT) and capture handled by the security-definer function.

## AI's role in this phase
**Maturity: AI-Assisted.** AI helped structure the requirements (brief, user flows), shape the data model, and reason about the multi-tenant identity approach. The human owns the chapter-politics constraints and the decision to keep AI features deferred until the funnel and Command Center are solid.

## Key artifacts
- [`../product/CrewCore Recruit Brief.md`](../product/CrewCore%20Recruit%20Brief.md), [`../product/CrewCore-Recruit-User-Flows.md`](../product/CrewCore-Recruit-User-Flows.md).
- [`../architecture/CrewCore-Recruit-Data-Model.md`](../architecture/CrewCore-Recruit-Data-Model.md) — live Slice 1 schema.
- [`../decisions/ADR-001-shared-multitenant-identity.md`](../decisions/ADR-001-shared-multitenant-identity.md) — multi-tenant identity decision (needs content restored).
- See the [artifact index](../artifacts/README.md).
