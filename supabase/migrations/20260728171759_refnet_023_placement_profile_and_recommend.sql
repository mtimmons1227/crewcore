-- ============================================================
-- Placement / availability profile + consent  ("Make the Call" data slice)
-- + recommend_chapter(): rules-based, HONEST single-chapter result today.
-- ============================================================

create table if not exists public.placement_profile (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.person(id) unique,
  home_zip text,
  work_zip text,
  weekday_afternoon_location text,   -- the 4:00-4:30pm "situation" answer
  evening_location text,             -- ~6:00-6:30pm
  travel_minutes int,
  weekdays jsonb,                    -- e.g. ["mon","tue",...]
  saturdays boolean,
  experience text,                   -- new | some | experienced
  chapter_preference text,
  reliable_transport boolean,
  share_consent boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.placement_profile enable row level security;

-- ------------------------------------------------------------
-- Save/upsert a recruit's placement profile (recruit-facing; gated by their token)
-- ------------------------------------------------------------
create or replace function public.save_placement_profile(
  p_token uuid,
  p_profile jsonb
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_person uuid; v_consent boolean;
begin
  select person_id into v_person from registration_cycle where access_token = p_token;
  if v_person is null then raise exception 'We could not identify you — open your registration link first'; end if;

  v_consent := coalesce((p_profile->>'share_consent')::boolean, false);

  insert into placement_profile as pp (
    person_id, home_zip, work_zip, weekday_afternoon_location, evening_location,
    travel_minutes, weekdays, saturdays, experience, chapter_preference,
    reliable_transport, share_consent, consent_at, updated_at
  ) values (
    v_person,
    p_profile->>'home_zip',
    p_profile->>'work_zip',
    p_profile->>'weekday_afternoon_location',
    p_profile->>'evening_location',
    nullif(p_profile->>'travel_minutes','')::int,
    p_profile->'weekdays',
    (p_profile->>'saturdays')::boolean,
    p_profile->>'experience',
    p_profile->>'chapter_preference',
    (p_profile->>'reliable_transport')::boolean,
    v_consent,
    case when v_consent then now() else null end,
    now()
  )
  on conflict (person_id) do update set
    home_zip = excluded.home_zip,
    work_zip = excluded.work_zip,
    weekday_afternoon_location = excluded.weekday_afternoon_location,
    evening_location = excluded.evening_location,
    travel_minutes = excluded.travel_minutes,
    weekdays = excluded.weekdays,
    saturdays = excluded.saturdays,
    experience = excluded.experience,
    chapter_preference = excluded.chapter_preference,
    reliable_transport = excluded.reliable_transport,
    share_consent = excluded.share_consent,
    consent_at = case when excluded.share_consent then now() else pp.consent_at end,
    updated_at = now();

  return jsonb_build_object('ok', true);
end $$;

-- ------------------------------------------------------------
-- "The Call": rules-based chapter-fit recommendation.
-- HONEST: recommends only among is_routing_active chapters (today: DBOA only),
-- and returns non-integrated chapters as referral alternatives, never as a decision.
-- ------------------------------------------------------------
create or replace function public.recommend_chapter(p_token uuid)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_person uuid;
  v_primary jsonb;
  v_active_count int;
  v_alts jsonb;
begin
  select person_id into v_person from registration_cycle where access_token = p_token;
  if v_person is null then raise exception 'We could not identify you — open your registration link first'; end if;

  select count(*) into v_active_count from chapter where is_routing_active is true;

  -- primary = the single integrated/active pathway (DBOA during the pilot)
  select jsonb_build_object(
    'chapter_id', c.id,
    'name', c.name,
    'reason', 'Your weekday location places you near several ' || c.name ||
              ' early-game assignment areas during early-game hours. This may provide a more practical path to your first assignments.'
  ) into v_primary
  from chapter c
  where c.is_routing_active is true
  order by c.is_integrated desc, c.name
  limit 1;

  -- alternatives = non-integrated chapters (guided referral only)
  select coalesce(jsonb_agg(jsonb_build_object(
      'chapter_id', c.id, 'name', c.name, 'region', c.region,
      'recruitment_url', c.recruitment_url, 'contact_email', c.contact_email
    ) order by c.name), '[]'::jsonb) into v_alts
  from chapter c
  where coalesce(c.is_routing_active,false) is false;

  return jsonb_build_object(
    'outcome', case when v_active_count <= 1 then 'single_integrated_fit' else 'multiple_viable' end,
    'primary', v_primary,
    'alternatives', v_alts,
    'disclaimer', 'CrewCore provides chapter-fit guidance based on the information you provide. Final membership, training, acceptance, and assignments are determined by each independent officials organization.'
  );
end $$;
