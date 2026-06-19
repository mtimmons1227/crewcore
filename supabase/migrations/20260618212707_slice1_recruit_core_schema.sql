-- CrewCore Recruit — Slice 1 core schema
-- Applied to Supabase project: nfcmesyfijtnrsdhypqn (CrewCore)
-- Tables: sport, association, chapter, person, membership, lead
-- Plus: RLS, public lead-capture function (submit_lead), seed (THSBOA + DBOA + Basketball)
--
-- NOTE: This migration is ALREADY applied to the live CrewCore database.
-- This file is the version-controlled record for the repo. Store it at:
--   supabase/migrations/20260618212707_slice1_recruit_core_schema.sql

create table if not exists sport (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists association (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists chapter (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state_association_id uuid references association(id),
  region text,
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists person (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  home_location text,
  created_at timestamptz not null default now()
);

create table if not exists membership (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references person(id) on delete cascade,
  chapter_id uuid not null references chapter(id) on delete cascade,
  sport_id uuid references sport(id),
  role text not null check (role in ('recruit','official','recruiter','chapter_admin','division_rep')),
  status text not null default 'lead' check (status in ('lead','onboarding','active','lapsed')),
  joined_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists lead (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references person(id) on delete cascade,
  chapter_id uuid not null references chapter(id) on delete cascade,
  sport_id uuid references sport(id),
  source text,
  score numeric,
  dropoff_risk text,
  stage text not null default 'recruit' check (stage in ('recruit','connect','onboard','track')),
  created_at timestamptz not null default now()
);

create index if not exists idx_membership_chapter on membership(chapter_id);
create index if not exists idx_membership_person on membership(person_id);
create index if not exists idx_lead_chapter on lead(chapter_id);
create index if not exists idx_lead_person on lead(person_id);

-- Enable Row-Level Security on every table
alter table sport enable row level security;
alter table association enable row level security;
alter table chapter enable row level security;
alter table person enable row level security;
alter table membership enable row level security;
alter table lead enable row level security;

-- Public reference reads (org info needed to render the public recruiting page)
create policy "public read sport" on sport for select using (true);
create policy "public read association" on association for select using (true);
create policy "public read chapter" on chapter for select using (true);

-- person, membership, lead: RLS enabled with NO select policy = locked down by default.
-- Recruiter read policies get added when staff auth is wired (Command Center task).

-- Public lead capture via a security-definer function: the anonymous form can submit
-- a lead without direct insert access to the person/lead tables.
create or replace function public.submit_lead(
  p_chapter_id uuid,
  p_full_name text,
  p_phone text default null,
  p_email text default null,
  p_sport_id uuid default null,
  p_source text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person_id uuid;
  v_lead_id uuid;
begin
  select id into v_person_id
  from person
  where (p_email is not null and email = p_email)
     or (p_phone is not null and phone = p_phone)
  limit 1;

  if v_person_id is null then
    insert into person (full_name, email, phone)
    values (p_full_name, p_email, p_phone)
    returning id into v_person_id;
  end if;

  insert into lead (person_id, chapter_id, sport_id, source, stage)
  values (v_person_id, p_chapter_id, p_sport_id, p_source, 'recruit')
  returning id into v_lead_id;

  return v_lead_id;
end;
$$;

grant execute on function public.submit_lead(uuid, text, text, text, uuid, text) to anon, authenticated;

-- Seed: THSBOA (state) + DBOA (local chapter) + Basketball, idempotent
insert into sport (name) values ('Basketball')
on conflict (name) do nothing;

insert into association (name)
select 'THSBOA - Texas High School Basketball Officials Association'
where not exists (
  select 1 from association
  where name = 'THSBOA - Texas High School Basketball Officials Association'
);

insert into chapter (name, state_association_id, region)
select 'DBOA - Dallas Basketball Officials Association', a.id, 'Dallas, TX'
from association a
where a.name = 'THSBOA - Texas High School Basketball Officials Association'
  and not exists (
    select 1 from chapter
    where name = 'DBOA - Dallas Basketball Officials Association'
  );
