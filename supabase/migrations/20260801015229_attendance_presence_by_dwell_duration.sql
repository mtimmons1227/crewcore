-- Presence is now the official's dwell (check-out minus check-in) vs the meeting's
-- scheduled LENGTH, not its calendar slot. Fixes 0% when the scan day differs from
-- the scheduled date and matches "measure against when they checked in and out."
CREATE OR REPLACE FUNCTION public.attendance_scan(p_official_token uuid, p_session_id uuid, p_code text, p_action text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_secret uuid; v_step uuid; v_person uuid;
  v_starts timestamptz; v_ends timestamptz; v_pct int; v_sched numeric;
  v_att public.session_attendance%rowtype;
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

  v_sched := case when v_starts is not null and v_ends is not null
                  then extract(epoch from (v_ends - v_starts)) else null end;

  if p_action = 'in' then
    insert into session_attendance(session_id, person_id, check_in_at, status, method)
    values (p_session_id, v_person, now(), 'checked_in', 'self')
    on conflict (session_id, person_id) do update set check_in_at = coalesce(session_attendance.check_in_at, now());
  elsif p_action = 'out' then
    update session_attendance set
      check_out_at = now(),
      status = case
        when v_sched is null or v_sched <= 0 then 'attended'
        when check_in_at is null then 'partial'
        when extract(epoch from (now() - check_in_at)) >= v_sched * v_pct / 100.0 then 'attended'
        else 'partial'
      end
    where session_id = p_session_id and person_id = v_person;
    if not found then
      insert into session_attendance(session_id, person_id, check_in_at, check_out_at, status, method)
      values (p_session_id, v_person, now(), now(), 'partial', 'self');
    end if;
    perform public.attendance_recompute(v_step, v_person);
  else
    raise exception 'Unknown action';
  end if;

  select * into v_att from session_attendance where session_id = p_session_id and person_id = v_person;
  return jsonb_build_object('status', v_att.status, 'check_in_at', v_att.check_in_at, 'check_out_at', v_att.check_out_at);
end $function$;

-- Roster present % also uses dwell / scheduled length (capped at 100).
CREATE OR REPLACE FUNCTION public.admin_session_roster(p_passcode text, p_session_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_starts timestamptz; v_ends timestamptz; v_pct int; v_sched numeric;
  v_title text; v_loc text; v_step text;
  v_roster jsonb; v_summary jsonb;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select ts.starts_at, ts.ends_at, coalesce(ts.attendance_min_pct,75), ts.title, ts.location, ws.name
    into v_starts, v_ends, v_pct, v_title, v_loc, v_step
    from training_session ts
    left join workflow_step ws on ws.id = ts.workflow_step_id
    where ts.id = p_session_id;
  v_sched := case when v_starts is not null and v_ends is not null
                  then extract(epoch from (v_ends - v_starts)) else null end;

  select coalesce(jsonb_agg(jsonb_build_object(
    'person_id', sa.person_id,
    'full_name', p.full_name,
    'check_in_at', sa.check_in_at,
    'check_out_at', sa.check_out_at,
    'status', sa.status,
    'min_pct', v_pct,
    'present_pct', case
      when v_sched is null or v_sched <= 0 or sa.check_in_at is null or sa.check_out_at is null then null
      else least(100, round(extract(epoch from (sa.check_out_at - sa.check_in_at)) / v_sched * 100))
    end,
    'overridden_by', sa.overridden_by,
    'override_reason', sa.override_reason,
    'overridden_at', sa.overridden_at
  ) order by p.full_name), '[]'::jsonb)
  into v_roster
  from session_attendance sa join person p on p.id = sa.person_id
  where sa.session_id = p_session_id;

  select jsonb_build_object(
    'total', count(*),
    'attended', count(*) filter (where status = 'attended'),
    'partial', count(*) filter (where status = 'partial'),
    'needs_review', count(*) filter (where status = 'needs_review'),
    'checked_in', count(*) filter (where status = 'checked_in')
  ) into v_summary
  from session_attendance where session_id = p_session_id;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', p_session_id, 'title', v_title, 'starts_at', v_starts, 'ends_at', v_ends,
      'location', v_loc, 'min_pct', v_pct, 'step_name', v_step),
    'summary', coalesce(v_summary, '{}'::jsonb),
    'roster', v_roster
  );
end $function$;