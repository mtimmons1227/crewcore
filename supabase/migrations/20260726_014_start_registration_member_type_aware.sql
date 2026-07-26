-- 014 — Make start_registration assemble the checklist by member_type via each step's audience.
-- 'new' (or null/empty audience) instantiates every step exactly as before (backward-safe).
-- A step is only 'locked' if its prerequisite is ALSO instantiated for this member_type;
-- otherwise it's 'available' (prevents orphaned-locked steps when a path skips a prereq).
create or replace function public.start_registration(
  p_email text, p_chapter_id uuid, p_sport_id uuid,
  p_season_id uuid default null::uuid, p_member_type text default 'new'::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_person_id uuid;
  v_season_id uuid;
  v_cycle_id uuid;
  v_mt text := coalesce(p_member_type, 'new');
begin
  select id into v_person_id from person where lower(email) = lower(p_email) limit 1;
  if v_person_id is null then
    raise exception 'No record found for that email - please submit your interest first';
  end if;

  v_season_id := coalesce(
    p_season_id,
    (select id from season where sport_id = p_sport_id
       order by coalesce(starts_on, created_at) desc limit 1)
  );
  if v_season_id is null then
    raise exception 'No active season is configured';
  end if;

  select id into v_cycle_id
  from registration_cycle
  where person_id = v_person_id and chapter_id = p_chapter_id
    and sport_id = p_sport_id and season_id = v_season_id;

  if v_cycle_id is null then
    insert into registration_cycle (person_id, chapter_id, sport_id, season_id, member_type,
                                    governing_body_id)
    values (v_person_id, p_chapter_id, p_sport_id, v_season_id, v_mt,
            (select governing_body_id from chapter where id = p_chapter_id))
    returning id into v_cycle_id;

    -- steps this member_type actually gets (audience-filtered; null/empty audience = everyone)
    with eligible as (
      select ws.id, ws.prerequisite_step_id
      from workflow_step ws
      where ws.chapter_id = p_chapter_id
        and (ws.sport_id = p_sport_id or ws.sport_id is null)
        and (
          ws.audience is null
          or jsonb_array_length(coalesce(ws.audience->'member_types', '[]'::jsonb)) = 0
          or (ws.audience->'member_types') ? v_mt
        )
    )
    insert into step_completion (cycle_id, workflow_step_id, status)
    select v_cycle_id, e.id,
           case when e.prerequisite_step_id is null
                  or e.prerequisite_step_id not in (select id from eligible)
                then 'available' else 'locked' end
    from eligible e;
  end if;

  return jsonb_build_object('status', 'registration_ready', 'cycle_id', v_cycle_id,
                            'member_type', v_mt);
end;
$function$;
