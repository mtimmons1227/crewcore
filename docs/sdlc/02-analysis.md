# Phase 2 — Analysis
**Also known as (AI-era): Requirements & Feasibility Analysis**
**Status: ✅ Complete (for CrewCore Recruit, Slices 1–2)**

---

## Purpose

Gather the detailed requirements the product must satisfy before design begins. Not just feature lists — the domain rules, authority structures, and edge cases that determine whether a system is correct. A requirements miss at this stage becomes a schema bug or an RLS policy gap later.

---

## Process (repeatable)

1. Name every stakeholder and their relationship to the system.
2. Write functional requirements as concrete capabilities, not abstract goals.
3. Identify domain rules — constraints that exist in the real world, independent of software.
4. Write non-functional requirements: security, tenancy, maintainability, correctness.
5. Enumerate the edge cases the data model must handle without ambiguity.
6. Confirm feasibility by shipping a slice against the real requirements.

---

## What we did on CrewCore Recruit

### Stakeholders

| Stakeholder | Role in system | Primary concern |
|---|---|---|
| **Recruit (prospect)** | Submits interest; works through onboarding steps; views status via magic link | "Tell me what to do next and when I'm done." |
| **Recruiter** | Works the lead pipeline; follows up on stalled recruits; marks steps complete on behalf of recruits | "Show me who needs attention without a spreadsheet." |
| **Chapter admin** | Owns the chapter's roster, workflow configuration, and clearance decisions | "Give me pipeline visibility and chapter-wide control." |
| **Board** | Sets chapter policy; approves budget and programs; receives pipeline reporting | "Show me this is working — numbers, not anecdotes." |
| **THSBOA** | State association; sets state-level registration and exam requirements | Not a direct system user; their requirements are encoded as workflow steps with `authority = 'state'`. |
| **NFHS / UIL** | National and state governing bodies above THSBOA | Not system users; their rules flow through THSBOA into chapter workflow configs. |

### Functional requirements

**F-1: Lead capture**
A prospect must be able to submit interest through a chapter-branded public page without creating an account. The page displays the chapter's name, tagline, logo, and visual identity. The submission creates a lead record scoped to that chapter, linked to the prospect's person identity, without the public form having direct write access to identity tables.

**F-2: Self-serve registration**
A recruit with a valid magic-link token must be able to see their current onboarding status, complete self-reportable steps, and enter an assessment score — all without a staff login. Steps that require staff verification or are locked by prerequisite must display correctly and reject premature completion attempts with a clear reason.

**F-3: Clearance tracking**
The system must compute whether a recruit clears for regular-season assignment and for playoff assignment, based on: (a) completion of all required steps for that member type, and (b) assessment score meeting the appropriate threshold. Regular threshold: ≥ 70. Playoff threshold: ≥ 90. A missing required step blocks clearance regardless of score. Clearance is a point-in-time determination, not a live subscription.

**F-4: Staff management**
An authenticated staff member (recruiter or chapter admin) must be able to: see all recruits for their chapter(s); view each recruit's full step-completion status with dates; mark steps complete on behalf of recruits (for `staff_verify` steps); see stall alerts for recruits inactive for more than 14 days; and view the dropout funnel. They must not be able to see data from chapters they do not belong to — enforced at the database layer, not the application layer.

### Domain rules

These are facts about the world that the software must reflect accurately. They are not preferences or implementation choices.

**DR-1: Governance chain authority**
Requirements flow downward: NFHS → UIL → THSBOA → DBOA. Each layer can add requirements; no layer can waive requirements set above it. State requirements (NFHS exam via ArbiterSports, THSBOA registration) are mandatory for all officials regardless of chapter-level decisions. Chapter requirements (DBOA dues, orientation, evaluation) are chapter-controlled. The `authority` field on `workflow_step` encodes this: `'state'` steps cannot be removed by chapter admins; `'chapter'` steps are configurable.

**DR-2: Chapter vs. state authority**
Steps with `authority = 'state'` represent THSBOA or UIL/NFHS requirements. These appear in the workflow regardless of chapter configuration and cannot be removed by a chapter admin. Steps with `authority = 'chapter'` are DBOA's own requirements and are fully configurable. The distinction is surfaced in the UI so chapters understand they're seeing state-mandated steps, not vendor-imposed ones.

**DR-3: Payment-gate prerequisites**
DBOA dues payment is a prerequisite for downstream steps. A recruit who has not paid dues cannot reach certain onboarding milestones. Dues are paid through RefTown (DBOA's ArbiterSports organization — org ID 6577). CrewCore tracks dues payment status as a workflow step completion; it does not process the payment itself until Slice 3 (Stripe integration).

**DR-4: Assessment clearance thresholds**
The NFHS rules exam is administered via ArbiterSports (org 6577). Scores are entered into CrewCore as a workflow step completion. Thresholds:
- ≥ 70: regular-season clearance
- ≥ 90: playoff clearance (includes regular season)
- < 70: no clearance

CrewCore records the score and computes clearance level. It does not administer or validate the exam. A recruit with a score of 65 is not cleared. A recruit with 70 is cleared for regular season only. A recruit with 90 is cleared for both.

**DR-5: Background check required; physical not required**
Background check is a required step for all member types — it blocks clearance if not completed. A physical / medical clearance is not currently a DBOA requirement and is not modeled as required. If DBOA adds it later, it is a workflow configuration change, not a code change.

**DR-6: Varied cadence per step**
Steps have different expected completion windows. Background checks take 3–10 business days. Rules exam results are immediate after submission. Dues payment is immediate if done online. Clinic attendance is scheduled to specific calendar dates (monthly or seasonal). The system does not enforce per-step deadlines; it flags stalls (>14 days since last progress) as a recruiter signal. Deadline enforcement is reserved for future configuration.

**DR-7: Real DBOA dues (2026–27, nonrefundable)**
Officials register in RefTown (ArbiterSports org 6577) as part of CrewCore onboarding. Dues are paid to DBOA there and are nonrefundable once paid.

| Member type | Dues |
|---|---|
| New | $125 |
| Returning (effective April 1) | $175 |
| Returning-from-inactive | $175 |
| Transfer | $175 |

These amounts are stored as reference data, not hardcoded in the application. They feed the pricing model's 10% success fee calculation.

**DR-8: State registration and exam via ArbiterSports org 6577**
DBOA officials complete their THSBOA registration and take the NFHS rules exam through ArbiterSports organization ID 6577. Both actions are external to CrewCore. CrewCore records completion status (registered: yes/no; exam score: numeric) via workflow step entries. This is the integration point — CrewCore does not call ArbiterSports APIs in Slices 1–2; the outcomes are entered by staff or self-reported by the recruit.

### Non-functional requirements

**NF-1: RLS tenant isolation**
Every lead, registration cycle, step completion, and membership record is scoped to a chapter. A staff user in chapter A must not be able to read, write, or infer the existence of records in chapter B — not through the API, not through direct Supabase client access, not through inferred counts. This is enforced at the database layer via Row-Level Security. Application-layer checks are defense-in-depth only; they are not the primary gate.

**NF-2: Safe public endpoints**
The public lead-capture form runs as an anonymous Supabase user. Anonymous access must not expose any data about existing leads, officials, or chapter members. The only write path from anonymous context is through the `submit_lead` security-definer function, which creates a `person` and a `lead` record and nothing else. Anonymous reads are limited to `sport`, `association`, and `chapter` — the public reference tables needed to render the chapter-branded form.

**NF-3: Snapshot honesty**
Clearance status is a point-in-time determination computed from the actual `step_completion` records at query time. If a recruit re-takes an exam and a new score record is entered, the system computes clearance from the new record. Historical completion records are not altered retroactively. Reports and compliance views must state their snapshot date explicitly. The system must not claim a recruit is cleared if their current record doesn't support it.

**NF-4: Solo-operator maintainability**
The system is maintained by one operator working across all layers — database, backend, frontend, and docs. This means: no automated test suite is required for early slices (manual verification is sufficient), but the schema must be self-documenting (columns named to match their business meaning), migrations must be idempotent (`IF NOT EXISTS` guards), and every non-obvious decision must be recorded in the session log or a decision doc. The product cannot depend on undocumented tribal knowledge held by any single person.

### Edge cases the data model must handle

**EC-1: Ordering ≠ prerequisite ≠ required**
`sort_order` on `workflow_step` determines display order — it does not imply prerequisite or requirement. A step can be optional (not required for clearance), gated by a prerequisite (a specific prior step must be complete before this one unlocks), or required-but-not-gated (must complete eventually, can be done in any order). These are independent attributes. The schema makes them explicit as separate fields; the UI derives locking and display from those fields — not from sort_order alone.

**EC-2: Per-type `applies_to`**
Some workflow steps apply only to specific member types. A "Transfer Authorization Letter" step applies to transfer officials only, not to new or returning officials. The `applies_to` field on `workflow_step` encodes the member types for which a step is relevant. A step not applicable to the recruit's member type does not appear in their checklist and is not considered in their clearance calculation. A transfer official's required steps are a superset of a new official's, but neither is a superset of the other in all cases.

**EC-3: Mid-season workflow change**
A chapter admin may add, remove, or reorder a workflow step mid-season after some recruits have already started onboarding. New step-completion records are not retroactively created for recruits who have already passed that point in the workflow. The system must handle registration cycles created before the current workflow configuration without corrupting existing completions or miscomputing clearance. The snapshot model handles this: clearance is computed from actual completion records matched against required steps, not from a diff between the prior and current workflow configuration.

**EC-4: Stall / ghost / defer lifecycle**
A recruit may stop responding (ghost), take a temporary leave (defer), or be paused by the chapter pending documentation (stall). These are distinct states with different recruiter responses. A ghost should surface in stall reports. A deferred recruit should not — their absence is expected and admin-acknowledged. The data model must represent these lifecycle states explicitly so the recruiter dashboard distinguishes them rather than collapsing them all into "inactive."

**EC-5: Transfer jurisdiction**
A transfer official moving from NTBOA to DBOA has prior officiating experience and may have already passed the NFHS rules exam with a score on record. Their prior exam score may satisfy DBOA's threshold, or DBOA may require a re-exam. The system records prior-chapter affiliation and the exam score (regardless of where it was taken). Chapter admins decide whether to accept a prior-chapter exam score or require re-examination — this is chapter policy, not system policy. The data model accommodates both paths without requiring code changes.

---

## AI's role in this phase

**Maturity: AI-Assisted.** AI helped structure the requirements, reason through edge cases (especially the snapshot model and the distinction between step ordering and prerequisites), and articulate domain rules from workshop conversation. The human owns the domain knowledge — specifically the DBOA dues schedule, the ArbiterSports org number (6577), the governance chain, and the political constraints around chapter authority vs. vendor control.

---

## Key artifacts

- [`../product/CrewCore-Recruit-User-Flows.md`](../product/CrewCore-Recruit-User-Flows.md) — user flows per stakeholder.
- [`../architecture/CrewCore-Recruit-Data-Model.md`](../architecture/CrewCore-Recruit-Data-Model.md) — live schema (source of truth: Supabase migrations).
- [`../decisions/ADR-001-shared-multitenant-identity.md`](../decisions/ADR-001-shared-multitenant-identity.md) — multi-tenant identity decision. *(Note: file currently holds a placeholder — decision text needs to be restored.)*
- `supabase/migrations/*` — the applied schema and RLS policies that encode these requirements.
- See the [artifact index](../artifacts/README.md).

---

**Status: ✅ Complete for Slices 1–2.** Stakeholders, functional requirements, domain rules, non-functional requirements, and the five edge cases are documented and encoded in the schema. Slice 3 (Dues/Stripe) will require addendum to F-3 (clearance) and DR-3 (payment gate) when payment is in the critical path.
