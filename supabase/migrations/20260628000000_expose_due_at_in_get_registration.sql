-- Expose due_at from step_completion in the get_registration RPC.
-- No schema changes — due_at already exists on step_completion.
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
