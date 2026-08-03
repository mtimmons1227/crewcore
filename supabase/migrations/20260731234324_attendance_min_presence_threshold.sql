-- 1) Per-session minimum-presence threshold (percent of scheduled length).
alter table public.training_session
  add column if not exists attendance_min_pct int not null default 75;

-- 2) Create-session accepts the threshold.
CREATE OR REPLACE FUNCTION public.admin_create_session(
  p_workflow_step_id uuid, p_title text, p_starts_at timestamptz,
  p_ends_at timestamptz, p_location text, p_passcode text, p_min_pct int default 75)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_chapter uuid; v_id uuid;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select chapter_id into v_chapter from workflow_step where id = p_workflow_step_id;
  insert into training_session(workflow_step_id, chapter_id, title, starts_at, ends_at, location, attendance_min_pct)
  values (p_workflow_step_id, v_chapter, p_title, p_starts_at, p_ends_at, p_location,
          greatest(0, least(100, coalesce(p_min_pct, 75))))
  returning id into v_id;
  return v_id;
end $function$;

-- 3) Check-out now judges presence against the scheduled window.
CREATE OR REPLACE FUNCTION public.attendance_scan(p_official_token uuid, p_session_id uuid, p_code text, p_action text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_secret uuid; v_step uuid; v_person uuid;
  v_starts timestamptz; v_ends timestamptz; v_pct int;
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

  if p_action = 'in' then
    insert into session_attendance(session_id, person_id, check_in_at, status, method)
    values (p_session_id, v_person, now(), 'checked_in', 'self')
    on conflict (session_id, person_id) do update set check_in_at = coalesce(session_attendance.check_in_at, now());
  elsif p_action = 'out' then
    update session_attendance set
      check_out_at = now(),
      status = case
        when v_starts is null or v_ends is null or extract(epoch from (v_ends - v_starts)) <= 0 then 'attended'
        when extract(epoch from (least(now(), v_ends) - greatest(coalesce(check_in_at, v_starts), v_starts)))
             >= extract(epoch from (v_ends - v_starts)) * v_pct / 100.0 then 'attended'
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

-- 4) Closing a session flags no-scan-out people for staff review (was auto left_early).
CREATE OR REPLACE FUNCTION public.close_session(p_session_id uuid, p_passcode text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_step uuid; v_review int;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select workflow_step_id into v_step from training_session where id = p_session_id;
  update session_attendance set status = 'needs_review'
   where session_id = p_session_id and check_out_at is null and status = 'checked_in';
  get diagnostics v_review = row_count;
  perform public.attendance_recompute(v_step, sa.person_id)
    from session_attendance sa where sa.session_id = p_session_id;
  return jsonb_build_object('status','closed','needs_review', v_review);
end $function$;