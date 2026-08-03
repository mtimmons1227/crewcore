-- Roster now returns session meta + summary counts + the rows.
CREATE OR REPLACE FUNCTION public.admin_session_roster(p_passcode text, p_session_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_starts timestamptz; v_ends timestamptz; v_pct int; v_sched numeric;
  v_title text; v_loc text; v_step text;
  v_roster jsonb; v_summary jsonb;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select ts.starts_at, ts.ends_at, coalesce(ts.attendance_min_pct,75), ts.title, ts.location, ws.name
    into v_starts, v_ends, v_pct, v_title, v_loc, v_step
    from training_session ts
    left join workflow_step ws on ws.id = ts.workflow_step_id
    where ts.id = p_session_id;
  v_sched := case when v_starts is not null and v_ends is not null
                  then extract(epoch from (v_ends - v_starts)) else null end;

  select coalesce(jsonb_agg(jsonb_build_object(
    'person_id', sa.person_id,
    'full_name', p.full_name,
    'check_in_at', sa.check_in_at,
    'check_out_at', sa.check_out_at,
    'status', sa.status,
    'min_pct', v_pct,
    'present_pct', case
      when v_sched is null or v_sched <= 0 or sa.check_in_at is null then null
      else round(greatest(0, extract(epoch from (
        least(coalesce(sa.check_out_at, sa.check_in_at), v_ends) - greatest(sa.check_in_at, v_starts)
      ))) / v_sched * 100)
    end,
    'overridden_by', sa.overridden_by,
    'override_reason', sa.override_reason,
    'overridden_at', sa.overridden_at
  ) order by p.full_name), '[]'::jsonb)
  into v_roster
  from session_attendance sa join person p on p.id = sa.person_id
  where sa.session_id = p_session_id;

  select jsonb_build_object(
    'total', count(*),
    'attended', count(*) filter (where status = 'attended'),
    'partial', count(*) filter (where status = 'partial'),
    'needs_review', count(*) filter (where status = 'needs_review'),
    'checked_in', count(*) filter (where status = 'checked_in')
  ) into v_summary
  from session_attendance where session_id = p_session_id;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', p_session_id, 'title', v_title, 'starts_at', v_starts, 'ends_at', v_ends,
      'location', v_loc, 'min_pct', v_pct, 'step_name', v_step),
    'summary', coalesce(v_summary, '{}'::jsonb),
    'roster', v_roster
  );
end $function$;

-- Session list carries a needs-review count for a badge.
CREATE OR REPLACE FUNCTION public.admin_list_sessions(p_passcode text, p_workflow_step_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_rows jsonb;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', ts.id,
      'title', ts.title,
      'starts_at', ts.starts_at,
      'ends_at', ts.ends_at,
      'location', ts.location,
      'attendee_count', (select count(*) from session_attendance sa where sa.session_id = ts.id),
      'needs_review_count', (select count(*) from session_attendance sa
                             where sa.session_id = ts.id and sa.status = 'needs_review')
    ) order by ts.starts_at nulls last, ts.created_at), '[]'::jsonb)
  into v_rows
  from training_session ts
  where ts.workflow_step_id = p_workflow_step_id;
  return v_rows;
end $function$;