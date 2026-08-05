# ADR-001: Shared multi-tenant identity (one person, many memberships)

- **Status:** Accepted
- **Date:** 2026-06 (formalized 2026-08)
- **Context area:** Data model / multi-tenancy

## Context

CrewCore serves multiple chapters (DBOA first, then NTBOA, FWBOA) under state governing bodies
(THSBOA, TASO). A single official commonly belongs to **more than one chapter** and pays **local
dues to each**, while paying **state dues only once**. We needed an identity model that supports
one human participating in several chapters without duplicating their record, mismatching them
across systems, or leaking one chapter's data to another.

## Decision

Model identity as **one `person` with many `membership` rows**, and scope everything chapter-
specific to the membership/cycle, not the person:

- `person` — one row per human (name, email, phone, auth link). The single identity.
- `membership` — the person's relationship to a chapter (`person_id`, `chapter_id`, `sport_id`,
  `role`, `status`, `division`). Many-to-many.
- `payment`, `registration_cycle`, `step_completion` — all scoped per chapter (and season), so
  dues, onboarding, and clearance are tracked independently for each chapter.
- `chapter` → `governing_body` — each chapter points to its governing body, whose
  `integration_type` selects the external adapter (Arbiter, Intra-Focus, …). This lets one
  official be activated in a **different assignment platform per chapter**.

Chapter isolation is enforced with Row-Level Security on the tenant-scoped tables; shared
`person` fields are exposed only as needed.

## Consequences

**Positive**

- A dual-chapter official is one person with two memberships — no duplicate identities, correct
  per-chapter dues and clearance, and clean per-chapter reporting.
- Multi-body / multi-state support falls out of the same model (governing body per chapter).
- Matches how external systems (e.g., RefTown) key identity, easing provisioning hand-offs.

**Costs / obligations**

- De-duplication at signup must be enforced in application logic (reuse the existing `person` when
  an official joins a second chapter) — a duplicate `person` is the primary failure mode.
- Some person-level attributes needed for identity matching and future features are additive and
  still to be added (DOB / legal name for RefTown matching, a primary-chapter flag, a state-
  standing record, per-membership provisioning state). These are specified in the **Schema
  Additions Spec** and are additive, not a redesign.
- RLS policies must be audited so every tenant-scoped table enforces chapter/self isolation.

## Alternatives considered

- **One record per person-per-chapter (no shared identity).** Rejected: duplicates the human,
  breaks "pay state dues once," and corrupts cross-chapter identity matching.
- **Single global membership with a chapter list column.** Rejected: can't cleanly scope dues,
  clearance, or RLS per chapter.

## Related

- Architecture & Design Manual — Data model and the pluggable-adapter integration design.
- Schema Additions Spec — the additive dual-chapter and mentor-signal fields.
