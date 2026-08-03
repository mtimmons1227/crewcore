-- Attendance / check-in engine (MVP): admin session calendar, rotating-code self check-in + check-out,
-- must-stay early-leaver flagging, auto-complete the step when attended count is met.
-- Staff actions gated by a demo passcode ('dboa2026') — DEMO-GRADE, replace with real staff auth at go-live.

-- 1) session calendar (admin-created)
create table if not exists public.training_session (
  id uuid primary key default gen_random_uuid(),
  workflow_step_id uuid not null references public.workflow_step(id) on delete cascade,
  chapter_id uuid references public.chapter(id),
  title text not null,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  code_secret uuid not null default gen_random_uuid(),  -- never leaves the server; seeds the rotating code
  created_at timestamptz not null default now()
);

-- 2) attendance (one row per official per session)
create table if not exists public.session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_session(id) on delete cascade,
  person_id uuid not null references public.person(id) on delete cascade,
  check_in_at timestamptz,
  check_out_at timestamptz,
  status text not null default 'checked_in',  -- checked_in | attended | left_early
  method text not null default 'self',        -- self | staff | offline
  created_at timestamptz not null default now(),
  unique (session_id, person_id)
);

alter table public.training_session enable row level security;
alter table public.session_attendance enable row level security;
-- no policies: direct access denied; everything goes through the security-definer functions below.

-- 3) rotating code helper: 45s window, 6-char code derived from the session's secret (present-to-scan)
create or replace function public._session_code(p_secret uuid, p_offset int default 0)
returns text language sql stable set search_path to 'public' as $$
  select upper(substr(md5(p_secret::text || ':' ||
    (floor(extract(epoch from now())/45)::bigint + p_offset)::text), 1, 6));
$$;

-- 4) staff: create a session
create or replace function public.admin_create_session(
  p_workflow_step_id uuid, p_title text, p_starts_at timestamptz,
  p_ends_at timestamptz, p_location text, p_passcode text)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_chapter uuid; v_id uuid;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select chapter_id into v_chapter from workflow_step where id = p_workflow_step_id;
  insert into training_session(workflow_step_id, chapter_id, title, starts_at, ends_at, location)
  values (p_workflow_step_id, v_chapter, p_title, p_starts_at, p_ends_at, p_location)
  returning id into v_id;
  return v_id;
end $$;

-- 5) venue kiosk: current rotating code + seconds until it refreshes (staff-gated so it can't be fetched remotely)
create or replace function public.get_session_code(p_session_id uuid, p_passcode text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_secret uuid;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select code_secret into v_secret from training_session where id = p_session_id;
  if v_secret is null then raise exception 'Session not found'; end if;
  return jsonb_build_object(
    'code', public._session_code(v_secret, 0),
    'expires_in', 45 - (floor(extract(epoch from now()))::bigint % 45)
  );
end $$;

-- 6) recompute: mark the attendance step complete when attended count >= required
create or replace function public.attendance_recompute(p_workflow_step_id uuid, p_person_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_required int; v_attended int; v_total int;
begin
  select count(*) into v_total from training_session where workflow_step_id = p_workflow_step_id;
  select coalesce((config->>'count_required')::int, (config->>'required_count')::int, v_total)
    into v_required from workflow_step where id = p_workflow_step_id;
  select count(*) into v_attended
    from session_attendance sa join training_session ts on ts.id = sa.session_id
    where ts.workflow_step_id = p_workflow_step_id and sa.person_id = p_person_id and sa.status = 'attended';
  if v_required is not null and v_required > 0 and v_attended >= v_required then
    update step_completion sc set status = 'complete', completed_at = now()
    from registration_cycle rc
    where sc.cycle_id = rc.id and rc.person_id = p_person_id
      and sc.workflow_step_id = p_workflow_step_id and sc.status is distinct from 'complete';
  end if;
end $$;

-- 7) official self check-in / check-out (validates rotating code, identifies by registration token)
create or replace function public.attendance_scan(
  p_official_token uuid, p_session_id uuid, p_code text, p_action text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_secret uuid; v_step uuid; v_person uuid; v_att public.session_attendance%rowtype;
begin
  select code_secret, workflow_step_id into v_secret, v_step from training_session where id = p_session_id;
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
    update session_attendance set check_out_at = now(), status = 'attended'
    where session_id = p_session_id and person_id = v_person;
    if not found then
      insert into session_attendance(session_id, person_id, check_in_at, check_out_at, status, method)
      values (p_session_id, v_person, now(), now(), 'attended', 'self');
    end if;
    perform public.attendance_recompute(v_step, v_person);
  else
    raise exception 'Unknown action';
  end if;

  select * into v_att from session_attendance where session_id = p_session_id and person_id = v_person;
  return jsonb_build_object('status', v_att.status, 'check_in_at', v_att.check_in_at, 'check_out_at', v_att.check_out_at);
end $$;

-- 8) staff: close a session — flag checked-in-but-not-out as left_early, then recompute everyone
create or replace function public.close_session(p_session_id uuid, p_passcode text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_step uuid; v_flagged int;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select workflow_step_id into v_step from training_session where id = p_session_id;
  update session_attendance set status = 'left_early'
   where session_id = p_session_id and check_out_at is null and status = 'checked_in';
  get diagnostics v_flagged = row_count;
  perform public.attendance_recompute(v_step, sa.person_id)
    from session_attendance sa where sa.session_id = p_session_id;
  return jsonb_build_object('status','closed','left_early_flagged', v_flagged);
end $$;

-- 9) recruit view: this official's sessions + their status for a given attendance step
create or replace function public.get_step_sessions(p_official_token uuid, p_workflow_step_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'session_id', ts.id, 'title', ts.title, 'location', ts.location,
    'starts_at', ts.starts_at, 'ends_at', ts.ends_at,
    'my_status', coalesce(sa.status, 'pending'),
    'check_in_at', sa.check_in_at, 'check_out_at', sa.check_out_at
  ) order by ts.starts_at), '[]'::jsonb)
  from training_session ts
  left join session_attendance sa on sa.session_id = ts.id
    and sa.person_id = (select person_id from registration_cycle where access_token = p_official_token)
  where ts.workflow_step_id = p_workflow_step_id;
$$;