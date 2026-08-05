-- Expose completed_via per step (get_registration) and add uncomplete_step so a
-- recruit can reopen a self-reported step they marked by accident.
CREATE OR REPLACE FUNCTION public.get_registration(p_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'cycle', jsonb_build_object(
       'status', rc.status,
       'clearance_level', rc.clearance_level,
       'member_type', rc.member_type,
       'cleared_at', rc.cleared_at,
       'chapter', c.name,
       'sport', sp.name,
       'season', se.name,
       'placement_confirmed', (rc.placement_confirmed_at is not null),
       'welcome_video_watched_at', rc.welcome_video_watched_at,
       'person', jsonb_build_object('full_name', p.full_name, 'email', p.email)
    ),
    'steps', coalesce((
       select jsonb_agg(jsonb_build_object(
          'step_id', ws.id,
          'name', ws.name,
          'sort_order', ws.sort_order,
          'step_type', ws.step_type,
          'cadence', ws.cadence,
          'required', ws.required,
          'completion_mode', ws.completion_mode,
          'config', ws.config,
          'status', sc.status,
          'completed_at', sc.completed_at,
          'completed_via', sc.completed_via,
          'due_at', sc.due_at,
          'evidence_url', sc.evidence_url,
          'data', sc.data
       ) order by ws.sort_order)
       from step_completion sc
       join workflow_step ws on ws.id = sc.workflow_step_id
       where sc.cycle_id = rc.id
    ), '[]'::jsonb)
  )
  from registration_cycle rc
  join chapter c on c.id = rc.chapter_id
  join sport sp on sp.id = rc.sport_id
  join season se on se.id = rc.season_id
  join person p on p.id = rc.person_id
  where rc.access_token = p_token;
$function$;

CREATE OR REPLACE FUNCTION public.uncomplete_step(p_token uuid, p_step_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_cycle_id uuid; v_mode text;
begin
  select id into v_cycle_id from registration_cycle where access_token = p_token;
  if v_cycle_id is null then raise exception 'Invalid registration link'; end if;
  select ws.completion_mode into v_mode
  from step_completion sc join workflow_step ws on ws.id = sc.workflow_step_id
  where sc.cycle_id = v_cycle_id and sc.workflow_step_id = p_step_id;
  if v_mode is null then raise exception 'That step is not part of this registration'; end if;
  if v_mode <> 'self_report' then raise exception 'Only self-reported steps can be reopened'; end if;
  update step_completion
  set status = 'available', completed_at = null, completed_via = null, updated_at = now()
  where cycle_id = v_cycle_id and workflow_step_id = p_step_id;
  return get_registration(p_token);
end $function$;

GRANT EXECUTE ON FUNCTION public.uncomplete_step(uuid, uuid) TO anon, authenticated;
