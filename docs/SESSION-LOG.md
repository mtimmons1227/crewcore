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

## 2026-06-27 — End-of-day wrap: pricing, logo, theme, board prep

### What shipped / decided

**Pricing model — finalized (pending board validation)**

- Standard base: **$5 / official / year**; DBOA founding rate: **$4 / official / year**
- **+ 10% success fee, first year only** — any official in their first year with the chapter (new *or* transfer), applied to dues they actually pay; converts to the $5 base in year two
- Calendar-year cutoff: **December 31** — roster count and first-year status both use a Dec-31 snapshot
- **Base reframed:** the per-official base is a whole-roster, year-round onboarding fee — CrewCore walks every official (new and veteran) through onboarding and clearance each season. This framing also defuses the "why charge on veterans" objection: veterans are in the platform too, not just recruits.
- Pricing at parity with RefTown (~$5/official); distinction is CrewCore is a **profit center**, RefTown is a cost center.

**Real DBOA dues (2026–27 registration form), nonrefundable:**

| Member type | Dues |
|---|---|
| New | $125 |
| Returning (eff. Apr 1) | $175 |
| Returning-from-inactive | $175 |
| Transfer | $175 |

Officials register in RefTown as part of CrewCore onboarding (RefTown is DBOA's assignment platform).

**DBOA estimate:** ~300 officials × $4 = $1,200 base; example 60 new × $125 × 10% = $750 success fee; heavy year ~$1,950, steady state ~$1,200.

Updated in: `docs/sdlc/08-future-releases.md` and `docs/strategy/competitive-brief.md`.

---

**DBOA logo**

- Hosted in Supabase Storage bucket **`chapter-logos`** as `dboa-logo.png`
- `chapter.logo_url` column added to the `chapter` table and set for the DBOA record
- Logo renders in the **Command Center** header (left of "CrewCore — DBOA" title) and on the **lead capture page** header — falls back to text-only if `logo_url` is null, so other chapters without a logo still work correctly

---

**Theme consolidation (commit `67eb63d`) — structural work done, palette swap pending**

- `tailwind.config.js`: shared `teal.*` token scale + `shadow-card/hero/soft` + `rounded-card` (28px) / `rounded-panel` (24px)
- `styles.css`: CSS custom properties (`--teal-*`, `--surface-*`, `--shadow-*`) mirror the Tailwind tokens; all hardcoded hex/rgba values replaced with `var()` references — one edit to `:root` re-skins both public pages
- `src/components/ui.tsx`: shared `<Card>` component used by the Command Center
- **BUT:** the shared palette was initially set to **teal/green** (the old public-page theme). The palette has since been swapped to the Command Center's navy/slate/blue values — `--teal-500` is now `#3b7cc4` (EarnedHome medium blue), dark text is slate-900, surface backgrounds are slate-50/100. Commit `48540fb` covers the palette flip.
- **Lead page status:** migrated to Tailwind + slate theme (commit `4081e52`). Currently shows the EarnedHome navy header + white Card form — matches the Command Center design language. The teal-green theme is gone from `/`.
- **Recruit timeline (`/r/:token`):** still uses `styles.css` CSS classes; those now resolve to the navy/blue tokens via the CSS vars. Visual re-skin happens automatically from the token swap — no TSX changes needed unless a full Tailwind migration is desired later.

---

**Board materials generated (outside this repo)**

- Branded one-pager PDF (CrewCore Recruit pitch)
- Founding-chapter agreement PDF
- Both have `[your email]` placeholder still to fill before sending
- Taking these + a live demo to the DBOA board is the **highest-value next move**

---

### Open items — ranked by priority

1. **Board meeting** — present pricing, one-pager, and founding-chapter agreement to DBOA board. Board reaction gates everything below.
2. **Slice 3 — Dues (Stripe)** — the next build once board approves. This is what makes the 10% success fee automatically attributable and collectible.
3. **Staff login page** — currently a functional gate (email + password form inside the Command Center page). Deserves a dedicated, polished `/login` route before any external staff onboarding.
4. **Lead page + recruit timeline navy restyle** — lead page is done; recruit timeline (`/r/:token`) inherits the navy tokens via CSS vars but has not been visually verified post-swap. Confirm it looks correct before the board demo.
5. **`workflow_step.authority` migration** — the column was applied directly to the live DB. Drop the SQL file into `supabase/migrations/` to keep the schema tracked. File name suggestion: `20260627_000000_add_workflow_step_authority.sql`.
6. **Fill board-material placeholders** — replace `[your email]` in both PDFs before distributing.

### Standing gotchas (unchanged)

- Supabase free tier pauses after ~1 week of inactivity — resume at supabase.com/dashboard before any dev session.
- Never `db reset` or `db push` on the live project.
- No automated tests — RLS bugs and schema drift only surface at runtime. Always verify on the live DB after a schema change.
- `workflow_step` table has no migration file in repo — do not drop/recreate without a manual backup.

---

## 2026-06-27 — Pricing model revised ($5 base / $4 DBOA)

### What changed

**Pricing update — still decided, still pending board validation**

Revised from the earlier ($4/$3) model. Changes:

| Item | Prior | Updated |
|---|---|---|
| Standard base | $4 / official / yr | **$5 / official / yr** |
| DBOA founding rate | $3 / official / yr | **$4 / official / yr** |
| 10% success fee scope | New officials only | **New + transfer, first year** |
| 10% basis | "new-official dues" (est. ~$150) | **Dues they actually pay** (real DBOA dues below) |

**Real DBOA dues (2026–27 registration, nonrefundable):**
- New: $125
- Returning (eff. Apr 1): $175
- Returning-from-inactive: $175
- Transfer: $175

Officials register in RefTown as part of CrewCore onboarding.

**Base-fee rationale added to record:** The per-official base is a whole-roster, year-round platform fee — CrewCore walks every official (new and veteran) through onboarding and clearance each season. This justifies charging per official across the full roster, not just new recruits. Pricing is at parity with RefTown (~$5/official to schedule); the difference is CrewCore is a profit center, not a cost center.

**DBOA estimate:**
- Base: ~300 × $4 = $1,200 / year
- Success fee (example): 60 new officials × $125 × 10% = $750
- Heavy recruiting year: ~$1,950 total
- Steady state: ~$1,200

**Documents updated:**
- `docs/sdlc/08-future-releases.md` — pricing section + claims ledger
- `docs/strategy/competitive-brief.md` — monetization section

### What did not change

- 10% is still first-year-only, still invoice-based until Slice 3
- Calendar-year Dec-31 cutoff unchanged
- CrowdIQ remains a separate service (framework only)
- All code and database unchanged

---

## 2026-06-27 — Pricing model finalized

### What changed

**CrewCore pricing model — decided (pending board validation)**

- Settled the monetization structure that was flagged as open in the competitive brief and in the Slice 2 next-actions list.
- Model: CrewCore software is priced standalone (not bundled with CrowdIQ or managed recruiting).
  - **$4/official/year** flat base for all officials.
  - **$3 founding-chapter rate** for DBOA, locked in at launch.
  - **+ 10% of new-official dues, first year only.** Each official in the calendar year they join triggers the 10%; in year two they convert to the $4 base.
  - **Calendar-year cutoff: December 31** — both roster count and new-recruit determination use a Dec-31 snapshot. Recruits after Dec 31 roll to the next year's 10% bucket.
  - **Billing:** annual invoice off the Dec-31 snapshot.
  - **Enforcement:** invoice-based until Slice 3 (Stripe dues) puts CrewCore in the payment path; after that, the 10% is automatically attributable and collectible.
- **CrowdIQ / managed recruiting** is a separate premium service: ad spend + management + margin, not bundled. Pricing framework only — not finalized.
- **Value framing:** RefTown ~$5/official (cost center); CrewCore ~$150 new dues per recruit (profit center) → $4 + 10%-year-one is value-justified.

**Claims ledger updated:**
- `docs/sdlc/08-future-releases.md` — added "Pricing model — DECIDED" section and a claims ledger table.
- `docs/strategy/competitive-brief.md` — replaced "Monetization — decision pending" with the decided model.

### What did not change

- No code changes. No database changes.
- Slice 3 scope, ADR-001, and the `workflow_step.authority` migration gap remain open (see prior entries).

### Next actions (unchanged from Slice 2 wrap)

1. **Board validation** — present pricing model; convert "pending board validation" to confirmed before external commitment.
2. **Add migration for `workflow_step.authority`** before the next DB change.
3. **Begin Slice 3 — Compliance** — compliance rollup, division-rep distribution view.
4. **Finalize CrowdIQ pricing** once managed-recruiting scope is defined.

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
