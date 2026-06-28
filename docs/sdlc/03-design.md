# Phase 3 — Design
**Also known as (AI-era): Solution Architecture & Pipeline Design**
**Status: ✅ Complete (Slices 1–2; later slices designed as reached)**

---

## Purpose

Turn the chosen approach into a concrete blueprint: system shape, data model, security model, and the user-facing surfaces. Design decisions made here determine what's possible and what's expensive to change later — particularly the schema and RLS model, which are hard to alter once data exists.

---

## Process (repeatable)

1. Choose the system shape (how many surfaces, where logic lives, what the backend provides).
2. Design the full data model — tables, columns, relationships, constraints.
3. Design the security model — who can read and write what, and how that's enforced.
4. Design the configurable units — the abstractions that let chapters vary behavior without code.
5. Design the clearance algorithm — the rules that determine assignment readiness.
6. Design the UI architecture — routes, components, data flow.
7. Record every significant decision as an ADR.

---

## What we did on CrewCore Recruit

### System shape

CrewCore Recruit has **three surfaces over a single Supabase backend**:

1. **`/` — Public lead capture page** (anonymous access): chapter-branded form; reads `chapter` by slug; submits through the `submit_lead` RPC; no direct table access.
2. **`/r/:token` — Recruit status page** (token-gated, no login): recruits see their onboarding progress and can complete self-reportable steps; access gated by the `access_token` UUID stored on `registration_cycle` (no separate token table).
3. **`/command` — Recruiter Command Center** (authenticated staff): full pipeline view for recruiters and chapter admins; reads leads, registration cycles, and step completions scoped to their chapter(s) via RLS.

**Where logic lives:** Business logic lives in the database via security-definer RPCs and RLS policies — not in the frontend. The frontend calls RPCs for writes that require privilege elevation; it reads directly from tables for data its RLS role already allows. This keeps the client thin and the security model auditable without reading application code.

### Data model (10 tables)

Source of truth: `supabase/migrations/`. Column names are taken from applied migrations.

#### Reference tables (public SELECT, no writes)

**`sport`**
- `id` uuid PK
- `name` text NOT NULL UNIQUE
- `created_at` timestamptz

**`association`**
- `id` uuid PK
- `name` text NOT NULL
- `created_at` timestamptz

**`season`**
- `id` uuid PK
- `name` text (e.g. "2026-27 Basketball Season")
- `sport_id` uuid → `sport(id)`
- `association_id` uuid → `association(id)`
- `starts_on` date
- `ends_on` date
- `created_at` timestamptz

#### Chapter tables (public SELECT on `chapter`)

**`chapter`**
- `id` uuid PK
- `name` text NOT NULL
- `state_association_id` uuid → `association(id)`
- `region` text
- `branding` jsonb (legacy; per-field display columns preferred)
- `slug` text UNIQUE (URL key, e.g. `'DBOA'`)
- `tagline` text
- `hero_text` text
- `accent_color` text
- `logo_url` text (Supabase Storage URL; `null` → text-only fallback in UI)
- `created_at` timestamptz

#### Identity tables (locked down; no public SELECT)

**`person`**
- `id` uuid PK
- `full_name` text
- `email` text
- `phone` text
- `home_location` text
- `auth_user_id` uuid UNIQUE → `auth.users(id)` ON DELETE SET NULL
- `created_at` timestamptz

**`membership`**
- `id` uuid PK
- `person_id` uuid NOT NULL → `person(id)` ON DELETE CASCADE
- `chapter_id` uuid NOT NULL → `chapter(id)` ON DELETE CASCADE
- `sport_id` uuid → `sport(id)`
- `role` text CHECK IN ('recruit','official','recruiter','chapter_admin','division_rep')
- `status` text DEFAULT 'lead' CHECK IN ('lead','onboarding','active','lapsed')
- `joined_at` timestamptz
- `created_at` timestamptz

**`lead`**
- `id` uuid PK
- `person_id` uuid NOT NULL → `person(id)` ON DELETE CASCADE
- `chapter_id` uuid NOT NULL → `chapter(id)` ON DELETE CASCADE
- `sport_id` uuid → `sport(id)`
- `source` text
- `score` numeric
- `dropoff_risk` text
- `stage` text DEFAULT 'recruit' CHECK IN ('recruit','connect','onboard','track')
- `created_at` timestamptz

#### Onboarding tables (Slice 2)

**`workflow_step`** *(configurable per-chapter step definitions; in migrations `slice2_registration_clearance_engine` + `add_workflow_step_authority`)*
- `id` uuid PK
- `chapter_id` uuid → `chapter(id)`
- `sport_id` uuid → `sport(id)`
- `name` text NOT NULL
- `sort_order` int NOT NULL
- `step_type` text (payment | external_confirm | acknowledgment | assessment | credential | attendance)
- `cadence` text DEFAULT 'annual' (annual | biennial)
- `required` boolean DEFAULT true
- `prerequisite_step_id` uuid → `workflow_step(id)`
- `completion_mode` text DEFAULT 'self_report' CHECK IN ('self_report','staff_verify')
- `config` jsonb DEFAULT '{}' (pricing, external_url, thresholds, applies_to rules, distributed_by, etc.)
- `authority` text DEFAULT 'chapter' CHECK IN ('state','chapter')
- `created_at` timestamptz

Note: `description` and `applies_to` are not top-level columns in the live DB. Member-type applicability is encoded in `config` jsonb.

**`registration_cycle`**
- `id` uuid PK
- `person_id` uuid → `person(id)` ON DELETE CASCADE
- `chapter_id` uuid → `chapter(id)` ON DELETE CASCADE
- `sport_id` uuid → `sport(id)`
- `season_id` uuid → `season(id)`
- `member_type` text (new | returning | transfer)
- `status` text DEFAULT 'in_progress'
- `clearance_level` text DEFAULT 'none' (none | regular | playoff)
- `cleared_at` timestamptz
- `access_token` uuid DEFAULT gen_random_uuid() — the magic-link credential; sent to the recruit; no separate token table
- `created_at` timestamptz

**`step_completion`**
- `id` uuid PK
- `cycle_id` uuid → `registration_cycle(id)` ON DELETE CASCADE
- `workflow_step_id` uuid → `workflow_step(id)` (FK; not step_name text)
- `status` text DEFAULT 'available' (available | complete | dropout | pending)
- `due_at` timestamptz
- `completed_at` timestamptz
- `verified_by_person_id` uuid → `person(id)`
- `evidence_url` text
- `data` jsonb DEFAULT '{}' (step-specific payload; assessment score stored as `data->>'score'`)
- `attempts` int DEFAULT 0
- `created_at` timestamptz
- `updated_at` timestamptz

Note: there is no `magic_link_token` table. The recruit's token is `registration_cycle.access_token` (a uuid generated at cycle creation).

### `workflow_step` as the configurable unit

`workflow_step` is the abstraction that lets each chapter define its own onboarding sequence without code changes. Key design decisions:

- **`sort_order`** determines display order only — it does not imply prerequisite or required status. These are independent attributes.
- **`completion_mode`** (`self_report` vs. `staff_verify`) determines who can mark a step complete. `self_report` steps can be completed by the recruit on their `/r/:token` page. `staff_verify` steps require a logged-in staff member.
- **`required`** determines whether the step blocks clearance. An optional step (e.g., an informational orientation) can be present without being required.
- **Member-type applicability** is encoded in the step's `config` jsonb (e.g., `config.required_for: ["new", "second_year", "IV", "V"]`). A step not applicable to the recruit's member type is hidden from their checklist and excluded from their clearance calculation. `applies_to` is not a separate column in the live DB.
- **`authority`** (`state` vs. `chapter`) distinguishes state-mandated steps from chapter-controlled steps. This is displayed to the chapter admin so they understand which steps they can modify.

A new chapter (NTBOA, FWBOA) onboards by seeding a set of `workflow_step` rows scoped to their `chapter_id`. No new code is required.

### Snapshot model

Clearance is computed **at query time** from the actual `step_completion` records, matched against the `workflow_step` definitions scoped to the recruit's chapter and member type. It is not stored as a flag that gets updated by triggers.

**Why snapshot, not trigger:** Triggers can silently fail or produce race conditions. The snapshot model means: (a) clearance is always derivable from raw records without secondary state; (b) workflow changes mid-season don't retroactively change clearance determinations already made; (c) an auditor can reproduce any clearance decision from the completion records alone.

The computed clearance level is stored in `registration_cycle.clearance_level` as a caching optimization for the Command Center roster, but it is always re-derivable from source records.

### Security model

**Public reads (no auth required):**
- `sport`, `association`, `chapter` — public SELECT enabled. These tables contain only reference data and chapter branding needed to render the public lead capture form.

**Auth-mapped helpers (authenticated only; locked down from `public` and `anon`):**

- **`public.current_person_id()`** — resolves `auth.uid()` to a `person.id` via `auth_user_id`. Security definer, stable, locked to `authenticated`. Used by RLS policies to identify the calling user in our people model without a join on every evaluation.
- **`public.current_user_chapter_ids()`** — returns the set of `chapter_id` values where the calling user holds `recruiter` or `chapter_admin` membership. Security definer, stable, locked to `authenticated`. The core of multi-tenant isolation: every authenticated read of `lead`, `registration_cycle`, and `step_completion` is gated to the chapters this function returns.

**The 4 public RPCs:**

1. **`public.submit_lead(p_chapter_id, p_full_name, p_phone, p_email, p_sport_id, p_source)`** — anonymous lead capture. Security definer; granted to `anon` and `authenticated`. Upserts `person` by email or phone, then inserts a `lead`. The public form never touches `person` or `lead` directly.

2. **`public.start_registration(p_email, p_chapter_id, p_sport_id, p_season_id, p_member_type)`** — creates a `registration_cycle` for an existing `person` (looked up by email), scoped to the given chapter, sport, season, and member type. Returns the new cycle id and the cycle's `access_token` (a UUID generated at row creation). Called by staff when a lead is ready to begin structured onboarding.

3. **`public.get_registration(p_token)`** — token-gated read for the recruit status page. Validates the magic-link token, returns the full registration cycle with its step list and current completion state. Accessible without auth (token is the credential); returns an error if the token is expired or not found.

4. **`public.complete_step(p_token, p_step_id, p_data)`** — marks a step complete within a registration cycle. Validates: token is valid and unexpired; the step belongs to the cycle; the step's `completion_mode` matches who is calling (recruits can only complete `self_report` steps via token; staff can complete any step when authenticated). Passes `p_data` (e.g., `{"score": 82}` for the state test) to `recompute_cycle_clearance` after writing the completion record.

**Internal functions:**

- **`public.recompute_cycle_clearance(p_cycle_id)`** — recomputes `registration_cycle.clearance_level` from the current `step_completion` records for the cycle. Applies the tiered clearance algorithm (required-step check → "THSBOA state test" score → `none` / `regular` / `playoff`). Internal; callable by **service_role only**. Invoked by `complete_step` (which is SECURITY DEFINER and executes with elevated privilege) and by the trigger below.
- **Trigger `tg_step_completion_cascade`** — fires `AFTER INSERT OR UPDATE` on `step_completion`; unlocks dependent steps and calls `recompute_cycle_clearance` so clearance is always consistent with completion records, even when records are inserted directly (e.g., via dashboard or migration scripts).

**RLS policies (summary):**
- `sport`, `association`, `chapter`: `FOR SELECT USING (true)` — public.
- `season`, `workflow_step`: `FOR SELECT TO anon, authenticated USING (true)` — public reference data.
- `lead`: `FOR SELECT TO authenticated USING (chapter_id IN (SELECT current_user_chapter_ids()))`.
- `person`: multiple policies — own-record (`auth_user_id = auth.uid()`), staff lead-read, staff cycle-person-read — all authenticated.
- `membership`: `FOR SELECT TO authenticated USING (person_id = current_person_id())`.
- `registration_cycle`, `step_completion`: `ALL TO authenticated` scoped to chapters via `current_user_chapter_ids()`.
- No `magic_link_token` table or policy. The recruit's token is `registration_cycle.access_token`; RPCs (`get_registration`, `complete_step`) validate it as a parameter — no direct table read by anon.

### Tiered clearance algorithm

Clearance level is computed by evaluating the recruit's `step_completion` records against the `workflow_step` definitions that apply to their chapter and member type:

```
-- actual column names from live DB
required_steps = workflow_step
  WHERE chapter_id = ? AND required = true
  -- member-type applicability checked via config jsonb

completed_required = step_completion
  WHERE cycle_id = ?
    AND workflow_step_id IN (required_steps.id)
    AND status = 'complete'

if completed_required.count < required_steps.count:
  clearance = 'none'   -- missing required step(s); no clearance regardless of score
else:
  exam_score = step_completion
    JOIN workflow_step ON workflow_step_id = workflow_step.id
    WHERE name = 'THSBOA state test' AND status = 'complete'
    → (data->>'score')::numeric

  if exam_score >= 90: clearance = 'playoff'   -- cleared for regular season AND playoffs
  elif exam_score >= 70: clearance = 'regular'  -- cleared for regular season only
  else: clearance = 'none'                       -- all required steps done but score too low
```

Thresholds: **70** = regular-season clearance; **90** = playoff clearance. State exam administered via ArbiterSports org **6577**; score entered into CrewCore via `complete_step`. Edge cases: no exam score recorded → `clearance = 'none'`; a step reversed → clearance recalculates from current records.

### DBOA workflow seed (8 steps)

The DBOA chapter is seeded with 8 `workflow_step` rows defining their onboarding sequence. The authoritative seed is in the live database (applied directly during Slice 2). Exact step names and configurations:

| # | Step name (exact) | Authority | Cadence | Required | Notes |
|---|---|---|---|---|---|
| 1 | Chapter application & dues | chapter | annual | Yes | DBOA-controlled; dues $125 new / $175 returning & transfer |
| 2 | THSBOA state registration & dues | state | annual | Yes | Registered via ArbiterSports org 6577 |
| 3 | Receive NFHS Rulebook & Case Book | state | annual | Yes | Physical or digital receipt |
| 4 | Receive NFHS Mechanics Manual | state | **biennial** | Yes | Required every other year, not annually |
| 5 | THSBOA state test | state | annual | Yes | Score entered via `complete_step`; ≥ 70 → regular clearance; ≥ 90 → playoff clearance; via ArbiterSports org 6577 |
| 6 | Background check & abuse-prevention training | state | annual | Yes | Staff-verified |
| 7 | DBOA training camp | chapter | **biennial** | Yes | DBOA-controlled; required every other year |
| 8 | Required off-season training (new / 2nd-year / Div IV-V) | chapter | annual | **No** | Applies to new officials, 2nd-year officials, and those in divisions IV–V; not required for clearance |

Steps 2–6 are `authority = 'state'` — state-mandated; cannot be removed or waived by the DBOA chapter admin. Steps 1, 7, 8 are `authority = 'chapter'` — DBOA-controlled and configurable. Step 8 is the only step with `required = false`; it is present in the workflow for tracking but does not block clearance.

### UI architecture

**Three routes:**
- `/` — `LeadCapturePage.tsx`: loads chapter by slug; renders branding (logo, tagline, hero text); submits via `submit_lead` RPC.
- `/r/:token` — `RecruitMenuPage.tsx`: loads registration cycle via token; renders onboarding timeline; accepts self-report completions and score entry.
- `/command` — `CommandCenterPage.tsx`: authenticated; loads leads and registration cycles for staff's chapters; renders pipeline with roster, detail panel, and step checklist.

**Design language:** EarnedHome — `bg-slate-900` header, white cards on `bg-slate-100`, slate text scale, medium-blue (`#3b7cc4`) primary button, `shadow-soft` on panels.

**Theme tokens:** CSS custom properties in `styles.css` (mirrored in `tailwind.config.js`) under the `--teal-*` / `teal.*` namespace. Values are navy/slate/blue despite the `teal` naming — names were preserved when the palette was swapped to avoid renaming cascades. Update both files together when changing the palette.

**Shared components:** `<Card>` in `src/components/ui.tsx` — `rounded-card border border-slate-200 bg-white shadow-soft`. Used by Command Center panels and the lead capture form.

### ADR table (001–016)

| ADR | Decision | Rationale |
|---|---|---|
| 001 | Shared multi-tenant identity — one `person` record per individual, scoped to chapters via `membership` | Portability: one official, multiple chapter memberships over a career |
| 002 | Security-definer RPC for anonymous lead capture (`submit_lead`) | Public form must not have direct write access to `person` or `lead` |
| 003 | Supabase as the backend platform (Postgres + Auth + RLS + Storage) | Batteries included: auth, RLS, storage, realtime, and managed Postgres in one service |
| 004 | Vite + React + TypeScript for the frontend | Fast development server; TypeScript catches column-name errors at build time |
| 005 | Chapter `slug` as the public URL key | Human-readable per-chapter URL (`/DBOA`) without exposing internal UUIDs |
| 006 | White-label chapter branding via DB columns (`tagline`, `hero_text`, `accent_color`, `logo_url`) | Chapter identity without code deploys when branding changes |
| 007 | `workflow_step` as the configurable step unit | New chapters onboard via data seed, not new code; chapters differ in config, not in features |
| 008 | Snapshot-based clearance (compute at query time from raw records) | Avoids trigger complexity and enables auditable clearance history |
| 009 | Tiered clearance thresholds — 70 (regular) / 90 (playoff) | DBOA requirement; encoded in clearance algorithm, not hardcoded in UI |
| 010 | Magic-link tokens for recruit status page access | No account required for recruits in early onboarding; low friction improves completion rate |
| 011 | Vertical slice delivery (schema + logic + UI per slice) | Each slice ships usable value; avoids horizontal layers that defer value until the end |
| 012 | EarnedHome design language (navy/slate/blue) | Chapter-quality design without a design team; EarnedHome palette is the reference |
| 013 | Tailwind CSS 3 for the frontend theme | Utility-first approach eliminates CSS naming conflicts and enables rapid UI iteration |
| 014 | CSS custom properties mirroring Tailwind tokens | CSS-based pages (`/r/:token`) and Tailwind pages (`/`, `/command`) share the same palette from one source |
| 015 | Supabase Storage for chapter logos (`chapter-logos` bucket) | Avoids repo binary bloat; logo_url in `chapter` table enables runtime logo updates |
| 016 | Pricing model: flat base + first-year success fee | Aligns CrewCore's revenue with chapter recruiting success; base covers the full roster |

---

## AI's role in this phase

**Maturity: AI-Assisted.** AI produced the data-model schema, the security-definer capture function, the RLS policy set, the tiered clearance algorithm, the UI architecture, and the ADR table. The human approved the schema and RLS posture before each migration was applied. All design decisions that affect chapter sovereignty (the authority model, the snapshot model, which steps can be removed by a chapter admin) were confirmed by the human.

---

## Key artifacts

- [`../architecture/CrewCore-Recruit-Data-Model.md`](../architecture/CrewCore-Recruit-Data-Model.md) — living data model doc (Slice 1 baseline; update as schema evolves).
- [`../architecture/CrewCore-Recruit-UI-Architecture.md`](../architecture/CrewCore-Recruit-UI-Architecture.md) — UI architecture.
- `supabase/migrations/*` — the authoritative schema and RLS as applied.
- `apps/web/tailwind.config.js`, `apps/web/src/styles.css` — theme tokens.
- `apps/web/src/components/ui.tsx` — shared `<Card>` component.
- See the [artifact index](../artifacts/README.md).

---

**Status: ✅ Complete for Slices 1–2.** The data model, security model, clearance algorithm, and ADRs 001–016 are decided and stable. Slice 3 will add a `payment` table or `dues_record` table and an additional RPC; those decisions will be documented as ADR-017+.
