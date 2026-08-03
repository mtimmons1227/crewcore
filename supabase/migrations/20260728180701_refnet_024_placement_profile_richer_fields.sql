-- Richer placement fields for the redesigned "Make the Call" (button-based) flow.
alter table public.placement_profile add column if not exists afternoon_location_type text; -- work|school|home|varies|other
alter table public.placement_profile add column if not exists evening_location_type text;   -- home|work|varies|other
alter table public.placement_profile add column if not exists saturday_availability text;    -- yes|sometimes|no
alter table public.placement_profile add column if not exists current_membership text;       -- yes|no|previously
alter table public.placement_profile add column if not exists willing_low_level text;        -- yes|maybe|no (middle school / sub-varsity)
alter table public.placement_profile add column if not exists transport_availability text;   -- yes|most|assistance
alter table public.placement_profile add column if not exists want_recommendation text;      -- recommend|compare (entry path)

-- Extend the upsert to store the new fields (backward compatible: old keys still work)
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
    reliable_transport, share_consent, consent_at,
    afternoon_location_type, evening_location_type, saturday_availability,
    current_membership, willing_low_level, transport_availability, want_recommendation,
    updated_at
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
    p_profile->>'afternoon_location_type',
    p_profile->>'evening_location_type',
    p_profile->>'saturday_availability',
    p_profile->>'current_membership',
    p_profile->>'willing_low_level',
    p_profile->>'transport_availability',
    p_profile->>'want_recommendation',
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
    afternoon_location_type = excluded.afternoon_location_type,
    evening_location_type = excluded.evening_location_type,
    saturday_availability = excluded.saturday_availability,
    current_membership = excluded.current_membership,
    willing_low_level = excluded.willing_low_level,
    transport_availability = excluded.transport_availability,
    want_recommendation = excluded.want_recommendation,
    updated_at = now();

  return jsonb_build_object('ok', true);
end $$;
