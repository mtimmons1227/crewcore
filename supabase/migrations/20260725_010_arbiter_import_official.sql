-- 010 — Arbiter -> RefNet import (Power Automate Project 2, RefNet side)
-- Given one official's Arbiter status, match by email and complete the two steps Arbiter is
-- the authority for (state dues, background check). recompute_cycle_clearance (fired by the
-- step-completion cascade) owns clearance_level, so we deliberately do NOT set it here.

create or replace function public.arbiter_import_official(
  p_email text,
  p_dues_paid boolean default false,
  p_bg_cleared boolean default false,
  p_regular_eligible boolean default false,
  p_playoff_eligible boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_person_id uuid;
  v_cycle_id  uuid;
  v_changed   text[] := '{}';
  v_unchanged text[] := '{}';
begin
  if p_email is null or length(btrim(p_email)) = 0 then
    return jsonb_build_object('email', p_email, 'matched', false, 'reason', 'missing_email');
  end if;

  select id into v_person_id
  from person
  where lower(email) = lower(btrim(p_email))
  order by created_at asc
  limit 1;

  if v_person_id is null then
    return jsonb_build_object('email', p_email, 'matched', false, 'reason', 'no_matching_person');
  end if;

  select id into v_cycle_id
  from registration_cycle
  where person_id = v_person_id
  order by (status = 'in_progress') desc, created_at desc
  limit 1;

  if v_cycle_id is null then
    return jsonb_build_object('email', p_email, 'matched', true,
                              'person_id', v_person_id, 'reason', 'no_registration_cycle');
  end if;

  if p_dues_paid then
    update step_completion sc
    set status = 'complete',
        completed_at = coalesce(sc.completed_at, now()),
        confirmed_at = now(),
        source = 'arbiter',
        external_ref = 'arbiter_import',
        updated_at = now()
    from workflow_step ws
    where sc.cycle_id = v_cycle_id
      and sc.workflow_step_id = ws.id
      and ws.name = 'THSBOA state registration & dues'
      and sc.status is distinct from 'complete';
    if found then v_changed := array_append(v_changed, 'state_dues');
    else v_unchanged := array_append(v_unchanged, 'state_dues'); end if;
  end if;

  if p_bg_cleared then
    update step_completion sc
    set status = 'complete',
        completed_at = coalesce(sc.completed_at, now()),
        confirmed_at = now(),
        source = 'arbiter',
        external_ref = 'arbiter_import',
        updated_at = now()
    from workflow_step ws
    where sc.cycle_id = v_cycle_id
      and sc.workflow_step_id = ws.id
      and ws.name = 'Background check & abuse-prevention training'
      and sc.status is distinct from 'complete';
    if found then v_changed := array_append(v_changed, 'background_check');
    else v_unchanged := array_append(v_unchanged, 'background_check'); end if;
  end if;

  return jsonb_build_object(
    'email', p_email,
    'matched', true,
    'person_id', v_person_id,
    'cycle_id', v_cycle_id,
    'steps_completed', to_jsonb(v_changed),
    'steps_unchanged', to_jsonb(v_unchanged),
    'arbiter_eligibility', jsonb_build_object(
      'regular_season', coalesce(p_regular_eligible, false),
      'playoff', coalesce(p_playoff_eligible, false)),
    'note', 'clearance_level is computed by RefNet from full workflow completion; Arbiter eligibility recorded for reference only'
  );
end;
$fn$;

revoke all on function public.arbiter_import_official(text, boolean, boolean, boolean, boolean) from public, anon;
