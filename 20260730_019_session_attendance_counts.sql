-- Kiosk-facing live attendance counts for the check-in/check-out display.
CREATE OR REPLACE FUNCTION public.get_session_attendance_counts(p_session_id uuid, p_passcode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v jsonb;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select jsonb_build_object(
    'checked_in_total', count(*) filter (where check_in_at is not null),
    'checked_out', count(*) filter (where check_out_at is not null)
  ) into v
  from session_attendance
  where session_id = p_session_id;
  return coalesce(v, jsonb_build_object('checked_in_total', 0, 'checked_out', 0));
end $function$;

GRANT EXECUTE ON FUNCTION public.get_session_attendance_counts(uuid, text) TO anon, authenticated;
