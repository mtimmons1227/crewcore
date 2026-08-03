-- DEMO ONLY: simulates the THSBOA/ArbiterSports sync by marking the state-tier steps complete
-- for a given registration (by access_token): state registration & dues, background check, state test.
-- In production these are confirmed by the real ArbiterSports import (arbiter-import), NOT this RPC.
-- SECURITY: this is a public, unauthenticated RPC that fakes verification — it MUST be gated or
-- removed before real recruit data. Tracked on the go-live checklist.
create or replace function public.demo_load_thsboa(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cycle uuid;
  v_count int;
begin
  select id into v_cycle from registration_cycle where access_token = p_token;
  if v_cycle is null then
    raise exception 'Invalid registration token';
  end if;

  update step_completion sc
  set status = 'complete', completed_at = now()
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