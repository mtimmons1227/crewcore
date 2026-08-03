-- Admin session management (list / update / delete), passcode-gated, SECURITY DEFINER
-- so they can see & modify training_session despite RLS-with-no-policies.

create or replace function public.admin_list_sessions(
  p_passcode text,
  p_workflow_step_id uuid
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_rows jsonb;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', ts.id,
      'title', ts.title,
      'starts_at', ts.starts_at,
      'ends_at', ts.ends_at,
      'location', ts.location,
      'attendee_count', (select count(*) from session_attendance sa where sa.session_id = ts.id)
    ) order by ts.starts_at nulls last, ts.created_at), '[]'::jsonb)
  into v_rows
  from training_session ts
  where ts.workflow_step_id = p_workflow_step_id;
  return v_rows;
end $$;

create or replace function public.admin_update_session(
  p_passcode text,
  p_session_id uuid,
  p_title text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_location text default null
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_id uuid;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  update training_session set
    title    = coalesce(p_title, title),
    starts_at = coalesce(p_starts_at, starts_at),
    ends_at  = coalesce(p_ends_at, ends_at),
    location = coalesce(p_location, location)
  where id = p_session_id
  returning id into v_id;
  if v_id is null then raise exception 'Session not found'; end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.admin_delete_session(
  p_passcode text,
  p_session_id uuid
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_att int;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select count(*) into v_att from session_attendance where session_id = p_session_id;
  delete from session_attendance where session_id = p_session_id;
  delete from training_session where id = p_session_id;
  return jsonb_build_object('ok', true, 'deleted_attendance', v_att);
end $$;
