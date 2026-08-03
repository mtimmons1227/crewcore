CREATE OR REPLACE FUNCTION public.get_session_code(p_session_id uuid, p_passcode text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_secret uuid;
  v_title text;
  v_loc text;
  v_starts timestamptz;
  v_ends timestamptz;
  v_step text;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select ts.code_secret, ts.title, ts.location, ts.starts_at, ts.ends_at, ws.name
    into v_secret, v_title, v_loc, v_starts, v_ends, v_step
    from training_session ts
    left join workflow_step ws on ws.id = ts.workflow_step_id
    where ts.id = p_session_id;
  if v_secret is null then raise exception 'Session not found'; end if;
  return jsonb_build_object(
    'code', public._session_code(v_secret, 0),
    'expires_in', 45 - (floor(extract(epoch from now()))::bigint % 45),
    'session_title', v_title,
    'session_location', v_loc,
    'starts_at', v_starts,
    'ends_at', v_ends,
    'step_name', v_step
  );
end $function$;