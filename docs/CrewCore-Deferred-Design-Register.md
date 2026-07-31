# CrewCore Deferred Design Register

This register tracks onboarding and staff pipeline design decisions that are intentionally deferred to later slices of CrewCore Recruit.

## Purpose
- Capture decisions that need more chapter validation, data model refinement, or cross-team alignment.
- Preserve design context while the team ships a working Slice 2 onboarding experience.
- Reference deferred items during implementation and validation.

## Deferred decisions

### 1. Chapter-specific onboarding checklist configuration
- Decision: whether onboarding steps should be modeled as static workflow templates or fully configurable chapter-level objects.
- Reason: DBOA needs a baseline workflow, but NTBOA/FWBOA may require different step names, approval criteria, and order.
- Status: Deferred until chapter workflow builder is available in Slice 5.
- Implication: Slice 2 uses a simplified `registration_step` structure with fixed completion modes.

### 2. Assessment score gating and validation
- Decision: require a minimum assessment score to pass and complete certain onboarding steps.
- Reason: the recruit experience should be clear about pass/fail thresholds, but the exact scoring rules may vary by chapter.
- Status: Deferred to Slice 2 implementation with a 70% threshold as the initial default.
- Implication: step completion UI must validate score input and refuse completion when under threshold.

### 3. Magic-link status page and expired token handling
- Decision: how to represent recruit magic links, expiration, and reuse on the public status page.
- Reason: token security and UX are critical for the `/r/:token` flow.
- Status: Deferred until the public-facing token flow is fully defined.
- Implication: the current design assumes a `get_registration` RPC from a valid token and may add token state checks later.

### 4. Staff pipeline dropout funnel and stalled cycle detection
- Decision: how to define stall thresholds, dropout step statuses, and pipeline summary metrics for staff.
- Reason: the early pipeline view should be useful without overloading staff with every step detail.
- Status: Deferred to Slice 2 with a 14-day stall rule and a simple step completion funnel.
- Implication: the first staff dashboard iteration focuses on cycle counts, stalled flags, and dropout rate.

### 5. Registration cycle lifecycle and cleared status
- Decision: whether a cycle is "cleared" only after all required steps are complete or after staff approval.
- Reason: some chapters may want a manual final verification step separate from the automated step completion flow.
- Status: Deferred until we confirm chapter operational practices.
- Implication: current pipeline design treats `completed` cycles as cleared and surfaces `cleared_at` when present.

## Notes
- This register is intentionally lightweight and actionable.
- New deferred items should be appended as the product evolves.
- The register is part of the Slice 2 onboarding design discipline.

### AI-readiness — what actually matters (note added this session)

**Principle:** Future AI features (LLM assists, RAG, lead scoring, drop-off
prediction) ride on the **data layer**, not the UI. The frontend styling
choice (Tailwind vs plain CSS, component look) has **zero bearing** on
AI-readiness — AI reads data and text, not CSS. Decide styling on looks and
maintainability alone.

**Already in place (the moat — protect these):**
- Structured Postgres over spreadsheets/PDFs.
- Clean, related tables with real timestamps: `registration_cycle`,
  `step_completion`, `workflow_step`, `person` — this is what an LLM/RAG
  feature reads from, and what scoring/prediction needs as history.
- Supabase ships `pgvector`, so embeddings / semantic search / RAG have a
  foundation already under us (extension not yet enabled).

**Levers for when AI is introduced (Slice 4+), all data-layer:**
- Keep data structured and labeled (ongoing discipline).
- Add a clean read API or DB views for an AI feature to pull from (small,
  build when needed).
- Enable the `pgvector` extension if/when we want semantic search or RAG
over chapter documents.
- Lead scoring / drop-off prediction depends on the accumulating
  `step_completion` timestamps and cycle states — already accruing.

**Claims integrity:** these are DESIGNED, not BUILT. Say "designed to use AI
for…", never "uses AI", until shipped.

### 6. Welcome video — revisit dynamic/personalized render before go-live
- Decision: whether the President welcome video stays hardcoded per path or becomes a dynamic, personalized render (recruit name, upcoming season, chapter/sport variables) at scale.
- Reason: current demo build hardcodes one Synthesia embed per path (`WELCOME_VIDEOS` map in `RecruitMenuPage.tsx`, keyed by `member_type` new/returning/transfer) because Synthesia's free plan has no API. The dynamic path was already built (`welcome-video` edge function + `welcome_video` cache table, one render per chapter/sport/season/path) but is dormant since it requires a paid Synthesia Creator/Enterprise plan.
- Status: **Deferred until before go-live.** Demo uses hardcoded per-path videos; all three currently point at the New-official render until Returning/Transfer versions are recorded.
- Implication: to go dynamic, (1) move to a paid Synthesia plan, (2) set `SYNTHESIA_API_KEY` + `SYNTHESIA_TEMPLATE_NEW/_RETURNING/_TRANSFER` as Supabase edge-function secrets, (3) re-wire `RecruitMenuPage` to invoke `welcome-video` again (the fallback already keeps a static video if the API is unconfigured). Weigh the per-render cost and personalization value (name + season) against just keeping the hardcoded per-path videos.
