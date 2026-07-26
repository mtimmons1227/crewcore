-- 009 — Lead notify webhook (Power Automate Project 1)
-- On every new lead, POST an enriched payload to a Power Automate flow that emails DBOA.
--
-- ⚠️ SECRET: the LIVE function contains a real *signed* Power Automate URL. Do NOT commit the
-- real value. The placeholder below must be replaced at deploy time from a secret store
-- (Supabase Vault or a private config). The live database already has the real URL in place.

create extension if not exists pg_net;

create or replace function public.notify_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := '<<POWER_AUTOMATE_LEAD_NOTIFY_URL>>';  -- replace from secret store
  v_payload jsonb;
begin
  select jsonb_build_object(
    'full_name', coalesce(p.full_name, ''),
    'email',     coalesce(p.email, ''),
    'phone',     coalesce(p.phone, ''),
    'chapter',   coalesce(c.name, ''),
    'sport',     coalesce(s.name, ''),
    'source',    coalesce(new.source, ''),
    'created_at', new.created_at
  )
  into v_payload
  from person p
  left join chapter c on c.id = new.chapter_id
  left join sport   s on s.id = new.sport_id
  where p.id = new.person_id;

  if v_payload is null then
    v_payload := jsonb_build_object(
      'full_name', '', 'email', '', 'phone', '',
      'chapter', coalesce((select name from chapter where id = new.chapter_id), ''),
      'sport',   coalesce((select name from sport   where id = new.sport_id), ''),
      'source',  coalesce(new.source, ''),
      'created_at', new.created_at);
  end if;

  perform net.http_post(
    url     := v_url,
    body    := v_payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_lead on public.lead;
create trigger trg_notify_new_lead
  after insert on public.lead
  for each row execute function public.notify_new_lead();
