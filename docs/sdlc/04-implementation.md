# Phase 4 — Implementation
**Also known as (AI-era): Build & Integration**
**Status: 🔄 In progress** — Slice 1 ✅ done; Slice 2 ✅ done; Slice 3 (Dues/Stripe) next.

---

## Purpose

Write the code that realizes the design — in vertical slices that each ship usable value. The implementation record here is a build ledger: what shipped, in what migration, and what lessons changed the way we work.

---

## Process (repeatable)

1. Build the schema + RLS for the slice (SQL migration file).
2. Build the backend logic (security-definer RPCs, triggers).
3. Build the user-facing flow against the new schema.
4. Apply the migration to the live Supabase project.
5. Verify the slice end-to-end in the browser (not just TypeScript build).
6. Update the session log (`docs/SESSION-LOG.md`) with what shipped and what's next.

---

## What we did on CrewCore Recruit

### Slice 1 — Lead Capture + Command Center ✅ Done

**Schema (5 migrations, all applied to `nfcmesyfijtnrsdhypqn`):**

| Migration file | What it adds |
|---|---|
| `20260619011113_slice1_recruit_core_schema.sql` | Core tables (`sport`, `association`, `chapter`, `person`, `membership`, `lead`), RLS on all tables, `submit_lead` RPC, DBOA + THSBOA + Basketball seed |
| `20260619021454_add_chapter_slug.sql` | `chapter.slug` (unique text); sets `DBOA` slug on seeded chapter |
| `20260619053826_add_chapter_display_fields.sql` | `chapter.tagline`, `chapter.hero_text`, `chapter.accent_color`; sets DBOA display values |
| `20260619193203_command_center_auth_and_recruiter_rls.sql` | `person.auth_user_id` (unique FK → `auth.users`); `current_person_id()` and `current_user_chapter_ids()` RPCs; recruiter + chapter_admin read policies on `lead`, `person`, `membership` |
| `20260619201720_lockdown_internal_rls_helper_functions.sql` | Revokes `execute` on `current_person_id()` and `current_user_chapter_ids()` from `public` and `anon`; grants only to `authenticated` |

**Frontend delivered:**
- `/` — `LeadCapturePage.tsx`: chapter-branded public form; loads chapter by slug; submits via `submit_lead`; falls back to text-only if `logo_url` is null.
- `/command` — `CommandCenterPage.tsx`: authenticated recruiter console; email + password auth via Supabase Auth; loads leads scoped to staff's chapter(s); search, status filter, stalled detection (>14 days), dropout funnel metrics.

**What the Command Center shows:** lead list with name, email, phone, stage, days since last activity. Stalled recruits (>14 days inactive) are surfaced with a visual indicator. Dropout funnel shows count by stage.

### Slice 2 — Registration / Clearance + Timeline + Roster ✅ Done

**Schema (4 migrations + 2 direct DB changes):**

| Migration file | What it adds |
|---|---|
| `20260619215722_slice2_registration_clearance_engine.sql` | `registration_cycle` table (`person_id`, `chapter_id`, `sport_id`, `season_id`, `member_type`, `clearance_level`, `access_token`), `step_completion` table (`cycle_id`, `workflow_step_id`, `data jsonb`, `attempts`), `workflow_step` table, DBOA 8-step seed, RLS policies |
| `20260619223447_slice2_self_serve_registration_rpcs.sql` | `start_registration`, `get_registration`, `complete_step`, `recompute_cycle_clearance` RPCs |
| `20260619223612_lockdown_slice2_internal_functions.sql` | Revokes public execute on `recompute_cycle_clearance`; grants to service_role only |
| `20260621180834_slice2_clearance_passfail_and_cycle_person_read.sql` | Clearance pass/fail logic; `person` read policy for staff viewing registration cycle members |

Note: there is no `magic_link_token` table. The recruit's token is `registration_cycle.access_token` — a UUID generated at cycle creation (`gen_random_uuid()`). `get_registration` and `complete_step` accept it as `p_token`.

**Backend logic delivered (applied directly to live DB; migration files pending):**
- **`start_registration(p_email, p_chapter_id, p_sport_id, p_season_id, p_member_type)`** — creates a `registration_cycle` for an existing person (by email) and returns a fresh `magic_link_token`.
- **`get_registration(p_token)`** — token-gated read; returns the full cycle + step list for the recruit status page.
- **`complete_step(p_token, p_step_id, p_data)`** — validates the token, enforces `completion_mode` (self_report vs. staff_verify), writes the `step_completion` record, and triggers clearance recompute.
- **`recompute_cycle_clearance(p_cycle_id)`** — internal; evaluates required steps and "THSBOA state test" score (≥ 70 regular / ≥ 90 playoff); updates `registration_cycle.clearance_level`.
- **Trigger `tg_step_completion_cascade`** — `AFTER INSERT OR UPDATE ON step_completion`; unlocks dependent steps and calls `recompute_cycle_clearance` so clearance stays consistent with completion records even on direct DB inserts.

**Frontend delivered:**
- `/r/:token` — `RecruitMenuPage.tsx`: magic-link-driven onboarding timeline; shows step list with status icons (check/ready/locked); inline assessment score entry (70+ to pass); progress summary ("Completed X · Ready Y · Locked Z").
- `/command` roster panel expanded: chevron-toggled row-level detail panel (two columns: recruit info + step checklist); member type badge (New/Returning/Transfer); clearance level display; step-by-step checklist with status icons and completion dates.
- **Tailwind/EarnedHome restyle:** full `bg-slate-900`/white/`bg-slate-100` design language; `rounded-card` (28px), `rounded-panel` (24px), `shadow-soft` on panels; `<Card>` shared component; CSS custom property tokens in `styles.css` mirrored in `tailwind.config.js`.

**Live DB state after Slice 2:**
- 8-step DBOA workflow in `workflow_step`.
- 6 recruits in `registration_cycle` (2 real + 4 sample records).
- Staff account `marv_timmons@yahoo.com` linked to `person` with DBOA `recruiter` membership.
- All migrations applied; security advisor passed.

### Post-Slice-2 additions

These were applied after Slice 2 closed, outside the slice boundary; both now have applied migration files:

- **`workflow_step.authority` column** — migration `20260627182800_add_workflow_step_authority.sql` ✅ applied. Distinguishes state-mandated steps (`'state'`) from chapter-controlled steps (`'chapter'`).
- **Chapter logo** — migration `20260627231447_add_chapter_logo_url.sql` ✅ applied. `chapter.logo_url` column added; Supabase Storage bucket `chapter-logos` created; `dboa-logo.png` uploaded; DBOA record updated. Logo renders in the Command Center header and the lead capture page dark header bar; falls back to text-only if `null`.
- **Theme token consolidation** — `tailwind.config.js` expanded with `teal.*` color scale (values: navy/slate/blue, despite the `teal` naming), `shadow-card`, `shadow-hero`, `rounded-card`, `rounded-panel`; `styles.css` `:root` block with `--teal-*` CSS custom properties; all hardcoded hex values in CSS replaced with `var(--teal-*)` references. Lead capture page migrated from CSS class-based styling to Tailwind utilities.

### The runtime-defect lesson

During Slice 2, a class of bugs appeared that TypeScript and `vite build` did not catch: **400 errors from wrong table or column names at runtime.** The Supabase client is dynamically typed at the query level — a `.from('registration_cycles')` (plural, wrong) compiles and builds cleanly but returns a 400 at runtime because the table is named `registration_cycle` (singular). Similarly, a column reference to `.select('clearance_status')` when the column is named `clearance_level` fails silently in TypeScript but loudly at runtime.

**Lesson encoded as operating discipline:**
- Build passing is a necessary but not sufficient condition. Always verify in the browser with the Network tab open.
- Table and column names must match the migration exactly — singular lowercase, no trailing 's'.
- After any schema change, open the affected page, inspect the Network tab, and confirm no 400 responses before marking the slice done.
- The session log records the current DB column names as a cross-check.

### Operating discipline (DB vs. frontend ownership)

The database is the source of truth. All schema changes go through SQL migration files applied to the live Supabase project. The frontend queries the database; it does not define the schema.

**Hard rules:**
- **Never run `supabase db reset` on the live project.** It drops and recreates all tables — instant data loss.
- **Never run `supabase db push` without verifying the diff against production.** It can apply migrations out of order if the local shadow DB has diverged.
- **Apply schema changes via the Supabase dashboard SQL editor** or `supabase migration up` after verifying the migration is correct and the live DB is in the expected state.
- **Every schema change gets a migration file** — applied direct-to-DB changes must be mirrored as migration files before the next DB change. The `workflow_step` table and the `authority` column are the current gap.
- **Keep the project awake.** Supabase free tier pauses after ~1 week of inactivity. A paused project returns 503s that look like auth errors. Resume at supabase.com/dashboard before any dev session.

---

## AI's role in this phase

**Maturity: AI-Assisted (LLM copilot).** AI generated the migration SQL, the security-definer RPCs, the React page components, and the Tailwind restyle. It worked slice by slice, with the human reviewing each migration file and approving the RLS posture before it was applied to the live DB. The human caught the runtime-defect pattern during Slice 2 testing and encoded it as operating discipline.

---

## Key artifacts

- `supabase/migrations/*.sql` — all applied migrations (authoritative schema).
- `apps/web/src/pages/CommandCenterPage.tsx` — Command Center (roster, detail panel, step checklist).
- `apps/web/src/pages/LeadCapturePage.tsx` — public lead capture form.
- `apps/web/src/pages/RecruitMenuPage.tsx` — recruit magic-link status page.
- `apps/web/src/components/ui.tsx` — shared `<Card>` component.
- `apps/web/tailwind.config.js`, `apps/web/src/styles.css` — theme tokens.
- [`../CrewCore-Recruit-Implementation-Plan.md`](../CrewCore-Recruit-Implementation-Plan.md) — slice plan with Supabase project reference.
- [`../SESSION-LOG.md`](../SESSION-LOG.md) — **read this first when resuming work.** Running handoff log of what shipped, current DB state, open items, and gotchas.
- [`../RUNBOOK.md`](../RUNBOOK.md) — local dev setup, staff onboarding SQL, pre-launch hardening checklist.
- See the [artifact index](../artifacts/README.md).

---

**Status: 🔄 In progress.** Slices 1–2 done and pushed to `origin/main`. All 11 migrations applied to `nfcmesyfijtnrsdhypqn`; no schema drift. Slice 3 (Dues/Stripe) begins after board validation of the pricing model.
