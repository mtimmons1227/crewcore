-- General session can define when a break-out group is released (the honest window).
alter table public.training_session add column if not exists new_release_at timestamptz;
-- Store each person's computed presence % on the row so the roster is consistent.
alter table public.session_attendance add column if not exists present_pct int;

CREATE OR REPLACE FUNCTION public.attendance_scan(p_official_token uuid, p_session_id uuid, p_code text, p_action text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_secret uuid; v_step uuid; v_person uuid;
  v_starts timestamptz; v_ends timestamptz; v_pct int; v_req numeric;
  v_att public.session_attendance%rowtype;
  v_open record;
  v_owin timestamptz; v_oreq numeric; v_odwell numeric; v_ostatus text; v_opct int;
  v_auto jsonb := null;
begin
  select code_secret, workflow_step_id, starts_at, ends_at, coalesce(attendance_min_pct,75)
    into v_secret, v_step, v_starts, v_ends, v_pct
    from training_session where id = p_session_id;
  if v_secret is null then raise exception 'Session not found'; end if;
  if upper(p_code) not in (public._session_code(v_secret,0), public._session_code(v_secret,-1)) then
    raise exception 'That code has expired — scan the current code on the screen';
  end if;
  select person_id into v_person from registration_cycle where access_token = p_official_token;
  if v_person is null then raise exception 'We could not identify you — open your registration link first'; end if;

  if p_action = 'in' then
    -- Auto check-out of any OTHER session this person is still checked into.
    select sa.session_id, sa.check_in_at, ts.starts_at as s_start, ts.ends_at as s_end,
           coalesce(ts.attendance_min_pct,75) as s_pct, ts.new_release_at as s_rel,
           ts.workflow_step_id as s_step, ts.title as s_title
      into v_open
      from session_attendance sa
      join training_session ts on ts.id = sa.session_id
      where sa.person_id = v_person and sa.session_id <> p_session_id
        and sa.status = 'checked_in' and sa.check_out_at is null
      order by sa.check_in_at desc
      limit 1;
    if found then
      v_owin := case when v_open.s_rel is not null and v_open.s_rel > v_open.s_start
                     then v_open.s_rel else v_open.s_end end;
      v_oreq := case when v_open.s_start is not null and v_owin is not null
                     then extract(epoch from (v_owin - v_open.s_start)) else null end;
      v_odwell := case when v_open.check_in_at is not null
                       then extract(epoch from (now() - v_open.check_in_at)) else 0 end;
      v_ostatus := case when v_oreq is null or v_oreq <= 0 then 'attended'
                        when v_odwell >= v_oreq * v_open.s_pct / 100.0 then 'attended'
                        else 'partial' end;
      v_opct := case when v_oreq is not null and v_oreq > 0
                     then least(100, round(v_odwell / v_oreq * 100)) else null end;
      update session_attendance
         set check_out_at = now(), status = v_ostatus, present_pct = v_opct
       where session_id = v_open.session_id and person_id = v_person;
      if v_open.s_step is not null then perform public.attendance_recompute(v_open.s_step, v_person); end if;
      v_auto := jsonb_build_object('session_title', v_open.s_title, 'status', v_ostatus, 'present_pct', v_opct);
    end if;

    insert into session_attendance(session_id, person_id, check_in_at, status, method)
    values (p_session_id, v_person, now(), 'checked_in', 'self')
    on conflict (session_id, person_id) do update set check_in_at = coalesce(session_attendance.check_in_at, now());

  elsif p_action = 'out' then
    v_req := case when v_starts is not null and v_ends is not null
                  then extract(epoch from (v_ends - v_starts)) else null end;
    update session_attendance set
      check_out_at = now(),
      present_pct = case when v_req is not null and v_req > 0 and check_in_at is not null
                         then least(100, round(extract(epoch from (now() - check_in_at)) / v_req * 100))
                         else null end,
      status = case
        when v_req is null or v_req <= 0 then 'attended'
        when check_in_at is null then 'partial'
        when extract(epoch from (now() - check_in_at)) >= v_req * v_pct / 100.0 then 'attended'
        else 'partial' end
    where session_id = p_session_id and person_id = v_person;
    if not found then
      insert into session_attendance(session_id, person_id, check_in_at, check_out_at, status, method, present_pct)
      values (p_session_id, v_person, now(), now(), 'partial', 'self', 0);
    end if;
    perform public.attendance_recompute(v_step, v_person);
  else
    raise exception 'Unknown action';
  end if;

  select * into v_att from session_attendance where session_id = p_session_id and person_id = v_person;
  return jsonb_build_object(
    'status', v_att.status, 'check_in_at', v_att.check_in_at,
    'check_out_at', v_att.check_out_at, 'auto_checked_out', v_auto);
end $function$;

-- Roster reads the stored present_pct (consistent with the window used at check-out).
CREATE OR REPLACE FUNCTION public.admin_session_roster(p_passcode text, p_session_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_title text; v_loc text; v_step text; v_starts timestamptz; v_ends timestamptz; v_pct int;
  v_roster jsonb; v_summary jsonb;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select ts.starts_at, ts.ends_at, coalesce(ts.attendance_min_pct,75), ts.title, ts.location, ws.name
    into v_starts, v_ends, v_pct, v_title, v_loc, v_step
    from training_session ts left join workflow_step ws on ws.id = ts.workflow_step_id
    where ts.id = p_session_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'person_id', sa.person_id, 'full_name', p.full_name,
    'check_in_at', sa.check_in_at, 'check_out_at', sa.check_out_at,
    'status', sa.status, 'min_pct', v_pct, 'present_pct', sa.present_pct,
    'overridden_by', sa.overridden_by, 'override_reason', sa.override_reason, 'overridden_at', sa.overridden_at
  ) order by p.full_name), '[]'::jsonb) into v_roster
  from session_attendance sa join person p on p.id = sa.person_id
  where sa.session_id = p_session_id;
  select jsonb_build_object(
    'total', count(*),
    'attended', count(*) filter (where status='attended'),
    'partial', count(*) filter (where status='partial'),
    'needs_review', count(*) filter (where status='needs_review'),
    'checked_in', count(*) filter (where status='checked_in')
  ) into v_summary from session_attendance where session_id = p_session_id;
  return jsonb_build_object(
    'session', jsonb_build_object('id', p_session_id, 'title', v_title, 'starts_at', v_starts,
      'ends_at', v_ends, 'location', v_loc, 'min_pct', v_pct, 'step_name', v_step),
    'summary', coalesce(v_summary, '{}'::jsonb), 'roster', v_roster);
end $function$;

-- Create-session accepts the optional release time.
CREATE OR REPLACE FUNCTION public.admin_create_session(
  p_workflow_step_id uuid, p_title text, p_starts_at timestamptz, p_ends_at timestamptz,
  p_location text, p_passcode text, p_min_pct int default 75, p_new_release_at timestamptz default null)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_chapter uuid; v_id uuid;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select chapter_id into v_chapter from workflow_step where id = p_workflow_step_id;
  insert into training_session(workflow_step_id, chapter_id, title, starts_at, ends_at, location, attendance_min_pct, new_release_at)
  values (p_workflow_step_id, v_chapter, p_title, p_starts_at, p_ends_at, p_location,
          greatest(0, least(100, coalesce(p_min_pct,75))), p_new_release_at)
  returning id into v_id;
  return v_id;
end $function$;