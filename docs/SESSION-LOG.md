# CrewCore — Session Log

## How to resume

**Read this file first.** It is the authoritative handoff record across all working sessions. Each entry documents what shipped, the current system state, where we stopped, and what comes next. Starting a new session without reading this will cause you to repeat work or make decisions without context.

**Quick orientation:**
- Supabase project ref: `fcmesyfijtnrsdhypqn` — this is the **live** project; treat it as production.
- Frontend lives in `apps/web` (Vite + React + TypeScript). Run `npm run dev` from there.
- The SDLC docs live in `docs/sdlc/`; the artifact index is `docs/artifacts/README.md`.
- The runbook (`docs/RUNBOOK.md`) covers local setup, staff onboarding SQL, and the pre-launch hardening list.
- **Never** run `supabase db reset` or `supabase db push` against the live project. See gotchas below.

---

## 2026-06-27 — Slice 2 wrap

### What shipped

**Slice 2 — Roster detail panel & restyle**
- Expanded the Command Center recruit roster with a chevron/disclosure icon on each row that opens a two-column detail panel in place (EarnedHome-inspired shell).
- Left column shows full recruit info: name + member type badge (New / Returning / Transfer), email, phone, started date, current step, clearance level.
- Right column shows the 8-step workflow checklist: each step has a status icon (green check + date if complete; teal "Ready" pill if available/in_progress; gray "Locked" pill + muted row if locked) and a "Completed X · Ready Y · Locked Z" summary above the list.
- Member type badge appears inline after the recruit's name in both the roster row and the detail panel header.
- Supabase `person` join expanded to include `phone` in the query.

**Tailwind / EarnedHome restyle**
- Tailwind CSS 3 fully integrated (`tailwind.config.js`, `postcss.config.js`, `@tailwind` directives in `styles.css`).
- All Command Center UI rebuilt on the slate-900/white/slate-50 EarnedHome design language — rounded panels, soft shadows, pill badges, progress bars.

**`workflow_step.authority` field**
- Added `authority` column to the `workflow_step` table in the live Supabase database (applied directly; no migration file in repo yet — add one before Slice 3).

**SDLC docs + competitive brief**
- Full SDLC documentation set (`docs/sdlc/00` through `08`) and the compiled Word deliverable (`docs/artifacts/CrewCore_SDLC_Documentation.docx`) added to the repo.
- `docs/strategy/competitive-brief.md` created: competitive landscape (Arbiter/Assign/GameOfficials/manual), CrewCore's differentiation table, monetization options, and strategic risks.
- `docs/artifacts/README.md` updated to index all existing docs across SDLC phases.
- `docs/README.md` updated (master docs index).
- `docs/CrewCore-Deferred-Design-Register.md` added and referenced.

**RecruitMenuPage**
- `apps/web/src/pages/RecruitMenuPage.tsx` added — the `/r/:token` magic-link status page for recruits.

**Supabase migrations committed**
- `20260620010000_add_registration_cycles.sql`
- `20260620011000_add_step_completion.sql`
- `20260620012000_add_registration_step_definitions.sql`
- `20260620013000_add_magic_link_tokens.sql`

### Current state

**Repository:** All Slice 2 work is committed to `main` and pushed to `origin/main`. Build is clean (`tsc && vite build` passes). No automated tests.

**Live database (Supabase `fcmesyfijtnrsdhypqn`):**
- 8-step DBOA workflow in `workflow_step` (with the new `authority` column applied directly).
- 6 recruits in `registration_cycle` — 2 real (Lawrence Daniels, Marvin Timmons) + 4 sample records seeded for UI testing.
- All Slice 2 migrations applied: `registration_cycle`, `step_completion`, `registration_step`, `magic_link_token`.
- Staff account `marv_timmons@yahoo.com` linked to a `person` record with DBOA recruiter membership.
- RLS is in place and scoped correctly; the security advisor passed (Slice 1 hardening still current).

**Frontend at `http://localhost:5174`** (dev server running on port 5174 because 5173 was in use). Production build deploys from `apps/web/dist/`.

### Where we stopped

- Finished writing the Slice 2 detail panel, committed and pushed.
- Created the competitive brief and updated the SDLC docs index.
- Did **not** add a migration file for `workflow_step.authority` — applied directly to the live DB. This is a known gap.
- Did **not** make any decisions on monetization.
- The old `docs/CrewCore-Recruit-SESSION-LOG.md` (Slice 1 status notes) is still in place; it is referenced as a historical artifact in `docs/artifacts/README.md`.

### Next actions

1. **Add migration for `workflow_step.authority`** — write `supabase/migrations/20260627_NNNNNN_add_workflow_step_authority.sql` before the next DB change to keep the schema tracked.
2. **Close Slice 2 formally** — update `docs/sdlc/04-implementation.md` to mark Slice 2 done, move Slice 3 to "next."
3. **Decide monetization** — review `docs/strategy/competitive-brief.md` (monetization section) and pick a model before Slice 3 planning begins.
4. **Reconcile old docs** — `docs/Implementation-Plan.md` and `docs/CrewCore-Recruit-Implementation-Plan.md` are likely duplicates; consolidate or deprecate.
5. **ADR-001 placeholder** — `docs/decisions/ADR-001-shared-multitenant-identity.md` currently contains a placeholder. Restore the decision text.
6. **Begin Slice 3 — Compliance** — compliance rollup, division-rep distribution view. Confirm scope with DBOA before building.

### Standing gotchas

- **Supabase free tier pauses** after ~1 week of inactivity. Resume it at supabase.com/dashboard before any dev session, or set a keep-alive query. A paused project returns 503s that look like auth errors.
- **Never `db reset` or `db push` on the live project.** `supabase db reset` drops and recreates all tables — instant data loss. `supabase db push` can apply migrations out of order if the local shadow DB diverges from production. Use the Supabase dashboard SQL editor or `supabase migration up` via the MCP tools after verifying the diff.
- **Build passing ≠ works.** TypeScript compiles and Vite builds, but there are no automated integration tests. RLS bugs, missing env vars, and Supabase schema drift only surface at runtime. Always verify on the live DB after a schema change.
- **`workflow_step` is not tracked by a repo migration** — the table and its data were created directly in Supabase. Do not drop/recreate it without a manual backup.
- **StripeUp artifact in this repo** — `StripeUp_AI_Matrix_and_Roadmap.xlsx` (in the repo root) belongs to a different project. Move it to the StripeUp repo when convenient; it is not a CrewCore artifact.

---

## 2026-06-27 — Earlier in the day

- Added a recruit onboarding timeline and progress summary to `/r/:token`.
- Implemented inline assessment score input with a 70+ pass threshold for assessment steps.
- Updated the staff Command Center pipeline section with registration cycle metrics, stalled detection after 14 days, and dropout funnel counts.
- Added Slice 2 onboarding migrations (`registration_cycle`, `step_completion`, `registration_step`, `magic_link_token`).
- Created `docs/CrewCore-Deferred-Design-Register.md`.

---

## 2026-06-19 — Slice 1 done

- Built the Command Center frontend: auth, leads list, empty state.
- Linked staff account (`marv_timmons@yahoo.com`) to a `person` record; assigned DBOA/Basketball `recruiter` membership.
- Verified end-to-end: public form → DB → secure Command Center, RLS scoping leads to the recruiter's chapter.
- Ran the Supabase security advisor; hardened internal helper functions to authenticated users only (migration `20260619201720`).
- Slice 1 (Capture) declared complete.
