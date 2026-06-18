# CrewCore Recruit — Data Model / Schema

**Module:** CrewCore Recruit
**Workflow stage:** Step 3 of 9 (Data Model / Schema)
**Status:** Draft v1 — for review
**Builds on:** `CrewCore-Recruit-Blueprint.md`, `CrewCore-Recruit-User-Flows.md`, `ADR-001`
**Last updated:** June 17, 2026

> Conceptual schema — entities, key fields, and relationships. Column types and indexes come later (Step 8/9). Built on ADR-001: shared multi-tenant DB, portable cross-sport identity, Chapter as tenant boundary.

---

## 1. Entity overview

**Global / shared (not chapter-scoped)**
- `Person` — the portable official identity (exists once)
- `Sport` — reference list (basketball, football, baseball…)
- `StepTemplate` — the shared step library
- `Association / GoverningBody` — the state/local authority hierarchy
- `RequirementConfig` — a configured requirement, owned by a state body (applies to all its chapters) or a local chapter

**Chapter-scoped (tenant = Chapter, RLS-isolated)**
- `Chapter` — the tenant (a local-level Association)
- `Membership` — a Person's relationship to a Chapter (+ Sport)
- `Lead` — the capture/funnel record
- `StepStatus` — an official's progress on a RequirementConfig
- `Compliance / Readiness` — derived per Membership; rolls up requirements across state + local layers
- `DiagnosticResponse` — answers feeding the weak-area insight

---

## 2. Entities

### Person (global)
The single portable identity. May exist as a lead before having any login.
- `id`, `full_name`, `email`, `phone`, `home_location`
- `account_id` (nullable) — links to auth only if/when the official gets a login
- `created_at`
- *Owns its own core profile (ADR-001 data ownership).*

### Account (global, optional)
Auth record, kept separate from Person so capture needs no login.
- `id`, `person_id`, `auth_provider`, `created_at`
- v1: magic-link based; full accounts optional.

### Sport (global)
- `id`, `name`

### Association / GoverningBody (global)
The authority hierarchy that requirements attach to.
- `id`, `name`, `level` — state / local (extensible: national, sport-body)
- `parent_id` (nullable) — a local body's state parent
- A local body **is** a `Chapter` (level = local); state bodies sit above them.
- State-level requirements defined here apply to **every** local chapter under that state.

### Chapter (tenant; a local-level Association)
- `id`, `name`, `region`, `state_association_id` (its parent state body), `branding` (logo, colors), `hosted_form_settings`
- `readiness_thresholds` — which states require which steps
- `routing_rules`

### Membership (chapter-scoped)
A Person's relationship to one Chapter, for one Sport. A Person has many.
- `id`, `person_id`, `chapter_id`, `sport_id`
- `role` — recruit / official / recruiter / chapter_admin / division_rep
- `status` — lead / onboarding / active / lapsed
- `joined_at`, `season`
- *Chapter owns this record.*

### StepTemplate (global library)
- `id`, `name`, `type` — payment / gear / assessment / event / compliance / profile
- `default_settings`

### RequirementConfig (formerly "ChapterStep")
A configured use of a StepTemplate — the heart of plug-and-play. Owned by a governing body, so the same model expresses both state-level and local-level requirements.
- `id`, `step_template_id`, `order`
- `owner_body_id` — the Association that set this requirement (a **state** body → applies to all its chapters; a **local** chapter → applies to that chapter only)
- `layer` — state / local (derived from `owner_body_id.level`)
- `required` (bool), `applies_to` — new / all / returning
- `recurrence` — one_time / per_season / annual / every_n_years
- `unlocks` — can_officiate / playoff_eligible / fully_compliant
- `deadline` (nullable), `post_deadline_behavior` — none / becomes_blocking
- `verification` — self / upload / admin / auto (distribution steps like rule books → admin/division_rep only)

### Lead (chapter-scoped)
The Stage 1–2 funnel record; promotes into an active Membership.
- `id`, `person_id`, `chapter_id`, `sport_ids`, `source`
- `score` (AI lead score), `dropoff_risk` (AI flag + reason)
- `stage` — recruit / connect / onboard / track
- `assigned_recruiter_id` (Membership of role recruiter), `created_at`

### StepStatus (chapter-scoped)
One official's progress on one ChapterStep, per cycle (for recurring steps).
- `id`, `membership_id`, `chapter_step_id`, `cycle` (season/year for recurring)
- `status` — not_started / in_progress / complete / verified
- `completed_at`, `verified_by`, `due_date`
- *Distribution/issuance steps (e.g., rule books): `verified_by` holds the `division_rep` membership who marked the item distributed. This replaces the rep's pencil-and-paper roster — the rep gets a who's-received-what view derived from StepStatus.*

### Compliance / Readiness (derived)
Per Membership; the **rollup of required steps across all layers that apply to the official** — their **state** body's requirements and their **local** chapter's requirements.
- `membership_id`
- `can_officiate` (bool), `playoff_eligible` (bool), `fully_compliant` (bool)
- `cleared_for_assignment` (bool) — all required, blocking steps satisfied at **both** state and local layers
- `outstanding` — list of incomplete required steps, each tagged by `layer` (drives the per-official compliance view)
- `as_of`
- *Derived, not hand-edited; recomputed when any StepStatus changes.*
- **Portability:** state-layer steps are satisfied once per official per state and shared across that official's chapters in the same state (they don't repeat state dues/test when joining a second chapter).

### DiagnosticResponse (chapter-scoped)
Feeds the rules weak-area insight.
- `id`, `membership_id`, `rule_discipline`, `question_id`, `is_correct`, `answered_at`
- Aggregated → chapter view of % correct by `rule_discipline`.

*(Supporting reference tables for the diagnostic: `RuleDiscipline`, `DiagnosticQuestion` — global or chapter-authored; see open questions.)*

---

## 3. Relationships

```
StateAssociation 1───* Chapter (local)        (parent_id hierarchy)
StateAssociation 1───* RequirementConfig       (state-level, applies to all its chapters)
Chapter          1───* RequirementConfig       (local-level)
RequirementConfig *───1 StepTemplate

Person 1───* Membership *───1 Chapter
                │
                *───1 Sport
Person 1───0..1 Account

Membership 1───* StepStatus *───1 RequirementConfig   (state or local)
Membership 1───1 Compliance/Readiness   (derived; rolls up both layers)
Membership 1───* DiagnosticResponse
Person 1───* Lead *───1 Chapter   (Lead promotes into Membership)
```

Key idea: **Person and the Association hierarchy are global; requirements attach at a state or local layer; an official's compliance rolls up both. Everything tying a person to a chapter (Membership, StepStatus, Compliance, Lead, DiagnosticResponse) is chapter-scoped and RLS-isolated, while satisfied state-layer steps are shared across that official's chapters in the same state.**

---

## 4. Multi-tenancy & security (per ADR-001)

- **Tenant boundary = `chapter_id`.** Every chapter-scoped table carries it and is protected by RLS so a chapter reads/writes only its own rows.
- **Global tables** (`Person`, `Sport`, `StepTemplate`) are shared; access to a `Person` from a chapter is gated by an existing `Membership` or the official's consent.
- **Cross-chapter sharing** is explicit and consent-based (sets up the Exchange later).
- Reuse StripeUp's RLS approach and testing discipline.

---

## 5. How it supports the requirements

- **Portable, cross-sport identity** → one `Person`, many `Membership`s across chapters and sports.
- **Plug-and-play onboarding** → `ChapterStep` configures `StepTemplate`s per chapter; `StepStatus` tracks progress.
- **Readiness profile** → derived `Readiness` from steps' `unlocks`, with deadline logic on `ChapterStep`.
- **Recurring steps** → `recurrence` + `StepStatus.cycle` handle annual dues, per-season scrimmages, periodic camp.
- **Diagnostic insight** → `DiagnosticResponse` aggregated by `rule_discipline`.
- **AI features** → `Lead.score` and `Lead.dropoff_risk`.

---

## 6. Assumptions to confirm

- **Auth:** v1 uses magic-link; `Account` is optional and separate from `Person`. (From flow review.)
- **Lead vs. Membership:** modeled as separate, with Lead promoting into Membership. (Alternative: Lead as an early Membership state — flag if you prefer that.)
- **Diagnostic question bank:** global vs. chapter-authored is open (Blueprint Q6).
- **Payments:** v1 *tracks* a payment step's status; it does not store financial transactions (those are Payouts). A "paid" StepStatus may later reference a Payouts record.

---

## Next step

**Step 4 — UI architecture:** page map and component structure for the three surfaces (lead-capture form, recruiter Command Center, chapter admin setup), plus the recruit status page.
