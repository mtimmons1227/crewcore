# CrewCore Recruit — Data Model / Schema

**Module:** CrewCore Recruit
**Workflow stage:** Step 3 of 9 (Data Model / Schema)
**Status:** Updated to Slice 1 live schema
**Source of truth:** supabase/migrations/20260618212707_slice1_recruit_core_schema.sql, 20260618213000_add_chapter_slug.sql, 20260619053500_add_chapter_display_fields.sql
**Last updated:** June 19, 2026

> Live schema for Slice 1. Table and column names below are taken from the applied Supabase migrations.

---

## 1. Tables

### sport
- id uuid primary key default gen_random_uuid()
- 
ame text not null unique
- created_at timestamptz not null default 
ow()

### association
- id uuid primary key default gen_random_uuid()
- 
ame text not null
- created_at timestamptz not null default 
ow()

### chapter
- id uuid primary key default gen_random_uuid()
- 
ame text not null
- state_association_id uuid references ssociation(id)
- egion text
- randing jsonb not null default '{}'
- slug text unique
- 	agline text
- hero_text text
- ccent_color text
- created_at timestamptz not null default 
ow()

### person
- id uuid primary key default gen_random_uuid()
- ull_name text
- email text
- phone text
- home_location text
- created_at timestamptz not null default 
ow()

### membership
- id uuid primary key default gen_random_uuid()
- person_id uuid not null references person(id) on delete cascade
- chapter_id uuid not null references chapter(id) on delete cascade
- sport_id uuid references sport(id)
- ole text not null check (role in ('recruit','official','recruiter','chapter_admin','division_rep'))
- status text not null default 'lead' check (status in ('lead','onboarding','active','lapsed'))
- joined_at timestamptz
- created_at timestamptz not null default 
ow()

### lead
- id uuid primary key default gen_random_uuid()
- person_id uuid not null references person(id) on delete cascade
- chapter_id uuid not null references chapter(id) on delete cascade
- sport_id uuid references sport(id)
- source text
- score numeric
- dropoff_risk text
- stage text not null default 'recruit' check (stage in ('recruit','connect','onboard','track'))
- created_at timestamptz not null default 
ow()

---

## 2. Live schema notes

- Table names are lowercase singular: sport, ssociation, chapter, person, membership, lead.
- chapter.slug is unique and serves as the public per-chapter URL key (for example: /DBOA).
- chapter.branding is stored as jsonb; 	agline, hero_text, and ccent_color are used by the public recruiting page.
- membership and lead both reference person, chapter, and optionally sport.

---

## 3. Public lead capture and security

Slice 1 exposes a security-definer RPC for anonymous lead capture:

- public.submit_lead(p_chapter_id, p_full_name, p_phone, p_email, p_sport_id, p_source)
- The function looks up an existing person by email or phone, inserts a new person if needed, then inserts a new lead.
- It is granted to non and uthenticated so the public web form can submit without direct insert privileges on person or lead.

### RLS model

- Public SELECT is allowed on sport, ssociation, and chapter.
- person, membership, and lead are locked down by default with no SELECT policy in Slice 1.
- Recruiter read policies are planned to ride on staff authentication in the Command Center.

---

## 4. Relationships

- chapter.state_association_id links a local chapter to its state association.
- person is the portable lead identity.
- membership captures a person’s chapter relationship and role.
- lead captures inbound interest before an active chapter membership is created.
- sport is a shared reference table used by both membership and lead.

## 5. Slice 1 alignment

This document now reflects the Slice 1 production schema as deployed in the Supabase migration chain. It is intentionally kept aligned with the live database rather than earlier conceptual models.
