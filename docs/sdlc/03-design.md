# Phase 3 — Design
**Also known as (AI-era): Solution Architecture & Pipeline Design**
**Status: ✅ Complete (for Slice 1; later slices designed as they're reached)**

## Purpose
Turn the chosen approach into a concrete blueprint: data model, components, interfaces, and the user-facing shape.

## Process (repeatable)
1. Blueprint the module and user flows.
2. Design the data model / schema.
3. Design the UI architecture.
4. Design AI features and automation (when reached).
5. Note cross-cutting concerns (multi-tenancy, security, branding).

## What we did on CrewCore Recruit

### Repo / system layout (`CLAUDE.md` conventions)
```
apps/web        → Vite + React + TypeScript public app (lead capture + Command Center)
services/api    → backend/API code
packages/shared → shared types/utilities
supabase/migrations → versioned schema + RLS
docs/product | docs/architecture | docs/decisions | docs/prompts
```

### Data model (Slice 1 live schema)
Source of truth: the applied Supabase migrations. Core tables:
- **`sport`**, **`association`** — reference data (public SELECT).
- **`chapter`** — name, `state_association_id`, region, `branding` (jsonb), `slug` (unique), `tagline`, `hero_text`, `accent_color` (public SELECT; drives white-label display).
- **`person`** — `full_name`, `email`, `phone`, `home_location`, `auth_user_id` (unique) — locked down.
- **`membership`** — `person_id`, `chapter_id`, `sport_id`, `role` (recruit/official/recruiter/chapter_admin/division_rep), `status` (lead/onboarding/active/lapsed) — locked down.
- **`lead`** — `person_id`, `chapter_id`, `sport_id` — locked down.

### UI architecture
Vite + React + TypeScript app in `apps/web`, Supabase client via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Public lead-capture flow: load chapter by `slug`, load sport by `name`, submit through the `public.submit_lead` RPC. The page renders chapter display data (`tagline`, `hero_text`, `accent_color`) for per-chapter branding. Routes: `/` public Lead Capture, `/command` recruiter Command Center.

### Security / multi-tenancy design
RLS isolates by chapter. Reference tables (`sport`, `association`, `chapter`) have public SELECT; `person`, `membership`, `lead` have **no** public SELECT in Slice 1. Lead writes go only through the security-definer `public.submit_lead` function, so the public app never holds write access to identity tables. Internal RLS helper functions are locked down (migration `20260619201720`).

### Designed-but-not-yet-built
AI feature design (lead scoring, drop-off prediction, routing, campaign drafting, readiness summaries) and chapter-config workflow builder are designed at the brief level but implemented in later slices (see [04-implementation.md](04-implementation.md), [08-future-releases.md](08-future-releases.md)).

## AI's role in this phase
**Maturity: AI-Assisted.** AI produced the data-model and UI-architecture documents and the security-definer capture pattern, following the project's fixed design order. The human approved the schema and the multi-tenant/branding approach.

## Key artifacts
- [`../architecture/CrewCore-Recruit-Data-Model.md`](../architecture/CrewCore-Recruit-Data-Model.md), [`../architecture/CrewCore-Recruit-UI-Architecture.md`](../architecture/CrewCore-Recruit-UI-Architecture.md).
- [`../product/CrewCore-Recruit-Blueprint.md`](../product/CrewCore-Recruit-Blueprint.md), [`../product/CrewCore-Recruit-User-Flows.md`](../product/CrewCore-Recruit-User-Flows.md).
- `supabase/migrations/*` — the schema/RLS as applied.
- See the [artifact index](../artifacts/README.md).
