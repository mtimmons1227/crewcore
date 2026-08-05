-- Trust core: record how each step was completed, and make the state test staff-verified.
-- Adds step_completion.completed_via (payment | admin | attendance | official | simulation),
-- flips the THSBOA state test off self-report, and records the source in every completion path.
ALTER TABLE step_completion ADD COLUMN IF NOT EXISTS completed_via text;

UPDATE workflow_step SET completion_mode = 'staff_verify' WHERE name = 'THSBOA state test';

CREATE OR REPLACE FUNCTION public.complete_step(p_token uuid, p_step_id uuid, p_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_cycle_id uuid;
  v_mode text;
  v_status text;
begin
  select id into v_cycle_id from registration_cycle where access_token = p_token;
  if v_cycle_id is null then raise exception 'Invalid registration link'; end if;

  select ws.completion_mode, sc.status into v_mode, v_status
  from step_completion sc
  join workflow_step ws on ws.id = sc.workflow_step_id
  where sc.cycle_id = v_cycle_id and sc.workflow_step_id = p_step_id;

  if v_mode is null then raise exception 'That step is not part of this registration'; end if;
  if v_mode <> 'self_report' then raise exception 'That step is completed by chapter staff'; end if;
  if v_status = 'locked' then raise exception 'Complete the prerequisite step first'; end if;

  update step_completion
  set status = 'complete', completed_at = now(), completed_via = 'official',
      data = coalesce(p_data, '{}'::jsonb), updated_at = now()
  where cycle_id = v_cycle_id and workflow_step_id = p_step_id;

  return get_registration(p_token);
end;
$function$;

CREATE OR REPLACE FUNCTION public.demo_load_thsboa(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_cycle uuid;
  v_count int;
begin
  select id into v_cycle from registration_cycle where access_token = p_token;
  if v_cycle is null then raise exception 'Invalid registration token'; end if;

  update step_completion sc
  set status = 'complete', completed_at = now(), completed_via = 'simulation'
  from workflow_step ws
  where sc.workflow_step_id = ws.id
    and sc.cycle_id = v_cycle
    and ws.name in (
      'THSBOA state registration & dues',
      'Background check & abuse-prevention training',
      'THSBOA state test'
    )
    and sc.status is distinct from 'complete';
  get diagnostics v_count = row_count;

  return jsonb_build_object('status', 'thsboa_loaded', 'steps_completed', v_count);
end;
$function$;

CREATE OR REPLACE FUNCTION public.attendance_recompute(p_workflow_step_id uuid, p_person_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  end if;
end;
$function$;
