-- Refine the board verify queue: exclude attendance steps that complete via
-- self check-in scan (those carry a count_required and auto-complete). Keep the
-- genuinely manual ones (external_confirm, credential, camp/off-season single-confirm).
create or replace function public.list_verify_queue(
  p_passcode text,
  p_chapter_id uuid default null
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_rows jsonb;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select coalesce(jsonb_agg(r order by r->>'full_name'), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'cycle_id', rc.id,
      'workflow_step_id', ws.id,
      'person_id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'step_name', ws.name,
      'step_type', ws.step_type,
      'member_type', rc.member_type,
      'status', sc.status
    ) as r
    from step_completion sc
    join workflow_step ws on ws.id = sc.workflow_step_id
    join registration_cycle rc on rc.id = sc.cycle_id
    join person p on p.id = rc.person_id
    where ws.completion_mode = 'staff_verify'
      and sc.status is distinct from 'complete'
      and not (
        ws.step_type = 'attendance'
        and coalesce((ws.config->>'count_required')::int, (ws.config->>'required_count')::int, 0) > 0
      )
      and (p_chapter_id is null or ws.chapter_id = p_chapter_id)
  ) q;
  return v_rows;
end $$;
