-- Lets the check-in page know the official's current status for a session,
-- so it can show "Check in" vs "Check out" vs "Attended" correctly.
create or replace function public.attendance_status(p_official_token uuid, p_session_id uuid)
returns jsonb
language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'session_title', ts.title,
    'session_location', ts.location,
    'starts_at', ts.starts_at,
    'status', coalesce(sa.status, 'pending'),      -- pending | checked_in | attended | left_early
    'check_in_at', sa.check_in_at,
    'check_out_at', sa.check_out_at
  )
  from training_session ts
  left join session_attendance sa on sa.session_id = ts.id
    and sa.person_id = (select person_id from registration_cycle where access_token = p_official_token)
  where ts.id = p_session_id;
$function$;