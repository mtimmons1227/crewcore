# CrewCore Recruit — Data Model / Schema

**Module:** CrewCore Recruit
**Workflow stage:** Step 3 of 9 (Data Model / Schema)
**Status:** Updated to Slice 1 live schema
**Source of truth:** supabase/migrations/20260618212707_slice1_recruit_core_schema.sql, 20260618213000_add_chapter_slug.sql, 20260619053500_add_chapter_display_fields.sql, 20260619121500_add_person_auth_user_id_and_recruiter_rls.sql
**Last updated:** June 19, 2026

> Live schema for Slice 1. Table and column names below are taken from the applied Supabase migrations.

---

## 1. Tables

### sport
- `id` uuid primary key default `gen_random_uuid()`
- `name` text not null unique
- `created_at` timestamptz not null default `now()`

### association
- `id` uuid primary key default `gen_random_uuid()`
- `name` text not null
- `created_at` timestamptz not null default `now()`

### chapter
- `id` uuid primary key default `gen_random_uuid()`
- `name` text not null
- `state_association_id` uuid references `association(id)`
- `region` text
- `branding` jsonb not null default '{}'
- `slug` text unique
- `tagline` text
- `hero_text` text
- `accent_color` text
- `created_at` timestamptz not null default `now()`

### person
- `id` uuid primary key default `gen_random_uuid()`
- `full_name` text
- `email` text
- `phone` text
- `home_location` text
- `auth_user_id` text unique
- `created_at` timestamptz not null default `now()`

### membership
- `id` uuid primary key default `gen_random_uuid()`
- `person_id` uuid not null references `person(id)` on delete cascade
- `chapter_id` uuid not null references `chapter(id)` on delete cascade
- `sport_id` uuid references `sport(id)`
- `role` text not null check (role in ('recruit','official','recruiter','chapter_admin','division_rep'))
- `status` text not null default 'lead' check (status in ('lead','onboarding','active','lapsed'))
- `joined_at` timestamptz
- `created_at` timestamptz not null default `now()`

### lead
- `id` uuid primary key default `gen_random_uuid()`
- `person_id` uuid not null references `person(id)` on delete cascade
- `chapter_id` uuid not null references `chapter(id)` on delete cascade
- `sport_id` uuid references `sport(id)`
- `source` text
- `score` numeric
- `dropoff_risk` text
- `stage` text not null default 'recruit' check (stage in ('recruit','connect','onboard','track'))
- `created_at` timestamptz not null default `now()`

---

## 2. Live schema notes

- Table names are lowercase singular: `sport`, `association`, `chapter`, `person`, `membership`, `lead`.
- `chapter.slug` is unique and serves as the public per-chapter URL key (for example: `/DBOA`).
- `chapter.branding` is stored as `jsonb`; `tagline`, `hero_text`, and `accent_color` are used by the public recruiting page.
- `person.auth_user_id` maps a Supabase auth account to a `person` record.
- `membership` and `lead` both reference `person`, `chapter`, and optionally `sport`.

---

## 3. Public lead capture and security

Slice 1 exposes a security-definer RPC for anonymous lead capture:

- `public.submit_lead(p_chapter_id, p_full_name, p_phone, p_email, p_sport_id, p_source)`
- The function looks up an existing `person` by email or phone, inserts a new `person` if needed, then inserts a new `lead`.
- It is granted to `anon` and `authenticated` so the public web form can submit without direct insert privileges on `person` or `lead`.

### RLS model

- Public `SELECT` is allowed on `sport`, `association`, and `chapter`.
- `person`, `membership`, and `lead` are locked down by default with no `SELECT` policy in Slice 1.
- Recruiter read policies are added in the new migration so logged-in recruiters and chapter admins can read leads for chapters they run.

---

## 4. Auth-mapped people and recruiter access

- `person.auth_user_id` associates a Supabase login account with a `person` identity in the system.
- `public.current_person_id()` resolves the current logged-in user to a `person.id` via `auth_user_id`.
- `public.current_user_chapter_ids()` returns the chapters where the current auth user has membership role `recruiter` or `chapter_admin`.
- Lead reads are gated to chapters returned by `public.current_user_chapter_ids()`.
- Person reads are allowed for the logged-in user's own `person` row, plus for persons attached to leads in those chapters.
- Membership reads are allowed for the current user's own membership row so the app can display account role.

---

## 5. Relationships

- `chapter.state_association_id` links a local chapter to its state association.
- `person` is the portable lead identity.
- `membership` captures a person’s chapter relationship and role.
- `lead` captures inbound interest before an active chapter membership is created.
- `sport` is a shared reference table used by both `membership` and `lead`.

## 6. Slice 1 alignment

This document now reflects the deployed Slice 1 Supabase schema, including the auth-user mapping and recruiter/chapter-admin read rules.
