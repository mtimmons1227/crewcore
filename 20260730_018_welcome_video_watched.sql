-- Persist the recruit's welcome-video "watched/collapsed" state server-side so it
-- behaves the same on any device. Adds the column, exposes it via get_registration,
-- and adds a setter the recruit page calls on first view.
ALTER TABLE registration_cycle ADD COLUMN IF NOT EXISTS welcome_video_watched_at timestamptz;

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

CREATE OR REPLACE FUNCTION public.set_welcome_video_watched(p_token uuid)
RETURNS timestamptz
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE registration_cycle
  SET welcome_video_watched_at = coalesce(welcome_video_watched_at, now())
  WHERE access_token = p_token
  RETURNING welcome_video_watched_at;
$function$;

GRANT EXECUTE ON FUNCTION public.set_welcome_video_watched(uuid) TO anon, authenticated;
