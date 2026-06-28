# Phase 7 — Maintenance
**Also known as (AI-era): Continuous Operations & Assurance**
**Status: ⏳ Not yet reached** — the product is pre-production for its first chapter. Maintenance begins at first-chapter go-live.

---

## Purpose

Keep the system correct, current, and secure after a chapter is using it in production. Maintenance is the longest phase — it continues for the life of the product. Getting maintenance right means the system can be trusted by chapter leadership without a technical person constantly watching it.

---

## Process (repeatable)

1. Track and apply schema changes as ordered, idempotent migrations.
2. Monitor lead-capture funnel and recruiter activity for anomalies.
3. Review Supabase security advisor findings regularly; resolve before new slices ship.
4. Run dependency updates (npm, Supabase client) on a regular cadence.
5. Handle seasonal rollover (new season row, new registration cycles).
6. Onboard new chapters via workflow configuration, not code changes.
7. Keep `CLAUDE.md`, `SESSION-LOG.md`, and `RUNBOOK.md` current.

---

## Anticipated operational concerns

### Free-tier pause → false-empty reads

**Risk:** Supabase's free tier pauses a project after approximately one week of inactivity. A paused project returns HTTP 503 responses. The Vite app interprets a 503 from Supabase as a failed request — the lead form appears to load but submissions silently fail, and the Command Center shows zero leads.

**Mitigation:**
- Before any dev or demo session, check the Supabase dashboard. If the project is paused, click "Resume" and wait 30–60 seconds.
- Long-term: upgrade to the Supabase Pro plan ($25/month) before the first chapter goes live on production traffic. The free tier is not appropriate for a live recruiting system.
- Alternative: set up a keep-alive ping (a lightweight cron request to the Supabase REST API every 3–4 days) to prevent pausing while staying on the free tier during early beta.

### Schema-drift discipline

**Risk:** A schema change applied directly to the live DB without a corresponding migration file creates drift between what's in the repo and what's in production. Future migrations may fail if they assume a different starting state. The `workflow_step` table and the `workflow_step.authority` column are the current drift gap.

**Rule:** Every schema change — including column additions, index creation, and constraint changes — gets a migration file in `supabase/migrations/` before the next migration is applied. The file is named `YYYYMMDDHHMMSS_description.sql`. It is idempotent (`IF NOT EXISTS`, `IF NOT EXISTS` on indexes, `DO $$ BEGIN ... EXCEPTION WHEN ... END $$` for constraint adds).

**Current drift:** None as of 2026-06-27. All 11 migrations are applied to `nfcmesyfijtnrsdhypqn` and tracked in the repo. `workflow_step` table was created in `slice2_registration_clearance_engine`. The `authority` column was added via `add_workflow_step_authority` (applied). The `logo_url` column was added via `add_chapter_logo_url` (applied). No unmirrored direct-DB changes remain.

### Seasonal rollover

**Timing:** DBOA's recruiting season peaks in summer and early fall before the high school basketball season. Each year requires:

1. **New season row** — insert a new record in the `season` or equivalent table (if not already auto-created) marking the new academic year.
2. **New `registration_cycle` records** — returning officials who need to re-register for the new season get fresh cycles. This is distinct from their prior-year cycle.
3. **Clearance reset** — returning officials start the new season without carryover clearance (state regulations may require annual re-registration and re-exam). DBOA policy on carryover should be confirmed before implementing the rollover process.
4. **Dues update** — if DBOA adjusts dues for the new year (currently $125 new / $175 returning/transfer for 2026–27), update the reference data in the DB before the new season's onboarding opens.

**Runbook entry:** The seasonal rollover SQL should be documented in [`../RUNBOOK.md`](../RUNBOOK.md) before the first rollover event.

### Workflow-edit propagation (snapshot model protection)

**Risk:** A chapter admin edits a workflow step (adds, removes, or changes `required` status) mid-season. This affects the computed clearance for recruits who are already in progress.

**How the snapshot model handles it:**
- The clearance algorithm always evaluates against the *current* `workflow_step` definition for the chapter. If a step is removed, it is excluded from the required-step check, and any existing `step_completion` records for that step are ignored.
- If a new required step is added mid-season, recruits who are already past that point in the workflow will show as not-cleared until they complete the new step, which may surprise them.
- The `authority = 'state'` protection ensures that state-mandated steps cannot be removed through the admin UI, preventing a chapter from accidentally clearing recruits who haven't met state requirements.

**Mitigation:** Workflow changes should be made at the start of a season, not mid-cycle. If mid-season changes are necessary, the chapter admin should understand that they will trigger re-evaluation of all in-progress recruits.

### Backups and restore

**Current state:** Supabase provides daily backups on the free tier (limited retention) and PITR on Pro.

**Before production go-live:**
- Enable PITR (Point-in-Time Recovery) on the Supabase project.
- Test a restore once — know the process before you need it under pressure.
- The migration files in `supabase/migrations/` are the schema restore path; they rebuild the structure but not the data. PITR covers data restoration.

**What to back up manually:**
- Migration files in `supabase/migrations/` rebuild the schema. PITR covers data restoration. No unmirrored schema remains as of 2026-06-27.

### Regular `get_advisors` review

Supabase provides a security advisor (`get_advisors` in the MCP tool) that flags RLS policy weaknesses, leaked function signatures, and other security concerns. After every new migration, run `get_advisors` and resolve any new findings before shipping the next slice.

**Slice 1 state:** security advisor passed after migration `20260619201720_lockdown_internal_rls_helper_functions.sql` resolved the open findings. Repeat after Slice 3.

### Dependency maintenance

| Dependency | Current concern |
|---|---|
| `@supabase/supabase-js` | Pin to a minor version; breaking changes in major versions have historically affected query builder syntax |
| Vite | Minor updates are safe; major updates may require `vite.config.ts` changes |
| Tailwind CSS | Pinned to v3; Tailwind v4 is a breaking change — do not upgrade mid-project without a full audit of custom token usage |
| React | Safe to patch-update; minor updates fine; major (v19+) requires testing |

Run `npm audit` monthly and address high/critical findings. Low-severity findings in dev dependencies can wait.

### Onboarding new chapters (NTBOA, FWBOA)

New chapters onboard via data configuration, not code changes:

1. **Insert chapter record** — name, slug, state_association_id (THSBOA), region, tagline, hero_text, logo_url.
2. **Seed workflow_step rows** — copy the DBOA seed as a starting point; adjust steps for the chapter's specific requirements (they may differ from DBOA's 8-step sequence).
3. **Onboard staff** — run the staff onboarding SQL from the runbook to link an auth account to a `person` record with `recruiter` or `chapter_admin` membership.
4. **Test RLS isolation** — before announcing the chapter is live, verify that DBOA staff cannot see the new chapter's recruits and vice versa.

---

## AI's role in this phase

**Maturity: AI-Assisted.** AI will draft migration files for schema changes, help with SQL for seasonal rollover, generate the runbook entries for new procedures, and assist with `get_advisors` review. A human approves every schema change and every RLS policy modification before it is applied to the live DB. The human owns the judgment calls: when to roll over a season, whether a workflow change affects in-progress recruits, when to upgrade Supabase tier.

---

## Key artifacts

- `supabase/migrations/*` — schema change history (authoritative).
- [`../RUNBOOK.md`](../RUNBOOK.md) — operational procedures, staff onboarding SQL, pre-launch and seasonal checklist.
- [`../../CLAUDE.md`](../../CLAUDE.md) — product conventions and file structure. Keep in sync as the codebase evolves.
- [`../SESSION-LOG.md`](../SESSION-LOG.md) — standing gotchas section tracks live operational risks.
- See the [artifact index](../artifacts/README.md).

---

**Status: ⏳ Not yet reached.** Foundations are in place (versioned migrations, RLS-first schema, living docs). Maintenance begins at first-chapter go-live. The anticipated concerns above are the agenda for the first maintenance sprint.
