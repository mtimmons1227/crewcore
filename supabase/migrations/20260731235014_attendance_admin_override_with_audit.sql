-- Override bookkeeping on the attendance row (latest change, for quick display).
alter table public.session_attendance
  add column if not exists overridden_by text,
  add column if not exists override_reason text,
  add column if not exists overridden_at timestamptz;

-- Full history of who changed a status and why.
create table if not exists public.attendance_status_audit (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_session(id) on delete cascade,
  person_id  uuid not null references public.person(id) on delete cascade,
  from_status text,
  to_status   text not null,
  actor_name  text not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);
create index if not exists attendance_status_audit_session_idx
  on public.attendance_status_audit(session_id, created_at desc);

-- Recompute now also REVERTS an attendance-completed step if the count drops
-- below the requirement (so admin downgrades take effect), not just completes it.
CREATE OR REPLACE FUNCTION public.attendance_recompute(p_workflow_step_id uuid, p_person_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_required int; v_attended int; v_total int;
begin
  select count(*) into v_total from training_session where workflow_step_id = p_workflow_step_id;
  select coalesce((config->>'count_required')::int, (config->>'required_count')::int, v_total)
    into v_required from workflow_step where id = p_workflow_step_id;
  select count(*) into v_attended
    from session_attendance sa join training_session ts on ts.id = sa.session_id
    where ts.workflow_step_id = p_workflow_step_id and sa.person_id = p_person_id and sa.status = 'attended';
  if v_required is not null and v_required > 0 and v_attended >= v_required then
    update step_completion sc set status = 'complete', completed_at = now(), completed_via = 'attendance'
    from registration_cycle rc
    where sc.cycle_id = rc.id and rc.person_id = p_person_id
      and sc.workflow_step_id = p_workflow_step_id and sc.status is distinct from 'complete';
  elsif v_required is not null and v_required > 0 then
    update step_completion sc set status = 'available', completed_at = null, completed_via = null
    from registration_cycle rc
    where sc.cycle_id = rc.id and rc.person_id = p_person_id
      and sc.workflow_step_id = p_workflow_step_id
      and sc.status = 'complete' and sc.completed_via = 'attendance';
  end if;
end $function$;

-- Staff roster for a session: names, times, computed presence, status, last override.
CREATE OR REPLACE FUNCTION public.admin_session_roster(p_passcode text, p_session_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_starts timestamptz; v_ends timestamptz; v_pct int; v_sched numeric; v jsonb;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select starts_at, ends_at, coalesce(attendance_min_pct,75) into v_starts, v_ends, v_pct
    from training_session where id = p_session_id;
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
      when v_sched is null or v_sched <= 0 or sa.check_in_at is null then null
      else round(greatest(0, extract(epoch from (
        least(coalesce(sa.check_out_at, sa.check_in_at), v_ends) - greatest(sa.check_in_at, v_starts)
      ))) / v_sched * 100)
    end,
    'overridden_by', sa.overridden_by,
    'override_reason', sa.override_reason,
    'overridden_at', sa.overridden_at
  ) order by p.full_name), '[]'::jsonb)
  into v
  from session_attendance sa join person p on p.id = sa.person_id
  where sa.session_id = p_session_id;
  return v;
end $function$;

-- Staff override: change a status, record who + why, keep an audit row, recompute.
CREATE OR REPLACE FUNCTION public.admin_set_attendance_status(
  p_passcode text, p_session_id uuid, p_person_id uuid,
  p_status text, p_actor text, p_reason text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_from text; v_step uuid;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  if coalesce(trim(p_actor),'') = '' then raise exception 'Your name is required'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'A reason is required'; end if;
  if p_status not in ('attended','partial','needs_review','checked_in') then
    raise exception 'Invalid status';
  end if;
  select status into v_from from session_attendance where session_id = p_session_id and person_id = p_person_id;
  if v_from is null then raise exception 'Attendance record not found'; end if;
  select workflow_step_id into v_step from training_session where id = p_session_id;

  update session_attendance
     set status = p_status, overridden_by = trim(p_actor),
         override_reason = trim(p_reason), overridden_at = now()
   where session_id = p_session_id and person_id = p_person_id;

  insert into attendance_status_audit(session_id, person_id, from_status, to_status, actor_name, reason)
  values (p_session_id, p_person_id, v_from, p_status, trim(p_actor), trim(p_reason));

  perform public.attendance_recompute(v_step, p_person_id);
  return jsonb_build_object('ok', true, 'from', v_from, 'to', p_status);
end $function$;

grant execute on function public.admin_session_roster(text, uuid) to anon, authenticated;
grant execute on function public.admin_set_attendance_status(text, uuid, uuid, text, text, text) to anon, authenticated;