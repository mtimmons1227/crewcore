-- Simulation helpers for the TEST environment (frontend gates these behind VITE_SIMULATION_MODE).
-- Token-based, matching demo_load_thsboa. Mark completed_via='simulation' so the "Test simulated"
-- badge shows. GO-LIVE: these + demo_load_thsboa must be removed/gated before real launch
-- (shared DB means they are callable with a token on production too).

-- Simulate a successful dues payment (completes the payment step, no Stripe).
create or replace function public.sim_mark_paid(p_token uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_cycle uuid; v_count int;
begin
  select id into v_cycle from registration_cycle where access_token = p_token;
  if v_cycle is null then raise exception 'Invalid registration token'; end if;
  update step_completion sc
    set status='complete', completed_at=now(), completed_via='simulation'
    from workflow_step ws
    where sc.workflow_step_id=ws.id and sc.cycle_id=v_cycle
      and ws.step_type='payment' and sc.status is distinct from 'complete';
  get diagnostics v_count = row_count;
  return jsonb_build_object('status','paid_simulated','steps_completed',v_count);
end $$;

-- Simulate completion of any single step (used for attendance auto-complete; pass the step id).
create or replace function public.sim_complete_step(p_token uuid, p_step_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_cycle uuid; v_count int;
begin
  select id into v_cycle from registration_cycle where access_token = p_token;
  if v_cycle is null then raise exception 'Invalid registration token'; end if;
  update step_completion
    set status='complete', completed_at=now(), completed_via='simulation'
    where cycle_id=v_cycle and workflow_step_id=p_step_id and status is distinct from 'complete';
  get diagnostics v_count = row_count;
  return jsonb_build_object('status','step_simulated','steps_completed',v_count);
end $$;
