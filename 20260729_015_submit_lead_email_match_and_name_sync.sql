-- Dedup interest submissions by EMAIL (the personal identity key, consistent with
-- start_registration), and keep the matched person's name/phone in sync with the
-- latest submission so the screen, the stored record, and any email always agree.
CREATE OR REPLACE FUNCTION public.submit_lead(
  p_chapter_id uuid,
  p_full_name text,
  p_phone text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_sport_id uuid DEFAULT NULL::uuid,
  p_source text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_person_id uuid;
  v_lead_id uuid;
begin
  -- Match on email only (case-insensitive). Phone is intentionally NOT used to
  -- match, because a shared household phone would otherwise merge two people.
  select id into v_person_id
  from person
  where p_email is not null and lower(email) = lower(p_email)
  limit 1;

  if v_person_id is null then
    insert into person (full_name, email, phone)
    values (p_full_name, p_email, p_phone)
    returning id into v_person_id;
  else
    update person
       set full_name = coalesce(nullif(btrim(p_full_name), ''), full_name),
           phone     = coalesce(nullif(btrim(p_phone), ''), phone)
     where id = v_person_id;
  end if;

  insert into lead (person_id, chapter_id, sport_id, source, stage)
  values (v_person_id, p_chapter_id, p_sport_id, p_source, 'recruit')
  returning id into v_lead_id;

  return v_lead_id;
end;
$function$;
