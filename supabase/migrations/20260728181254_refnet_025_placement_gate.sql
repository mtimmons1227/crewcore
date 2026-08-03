-- Gate the onboarding checklist behind "Make the Call" (chapter-fit) confirmation.
-- Non-breaking: adds a flag + a confirm RPC. Step statuses are NOT changed here, so the
-- currently-deployed checklist keeps working until the frontend enforces the gate.
alter table public.registration_cycle add column if not exists placement_confirmed_at timestamptz;

-- Called by "Continue with <chapter>" on the Make the Call result → unlocks the checklist (frontend gate).
create or replace function public.confirm_placement(
  p_token uuid,
  p_chapter_id uuid default null
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_id uuid;
begin
  update registration_cycle
     set placement_confirmed_at = coalesce(placement_confirmed_at, now())
   where access_token = p_token
   returning id into v_id;
  if v_id is null then raise exception 'We could not identify you — open your registration link first'; end if;
  return jsonb_build_object('ok', true, 'placement_confirmed', true);
end $$;

-- Add placement_confirmed to get_registration (flag only; statuses unchanged).
create or replace function public.get_registration(p_token uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
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
