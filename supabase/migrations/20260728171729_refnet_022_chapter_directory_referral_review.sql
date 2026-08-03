-- ============================================================
-- Chapter directory + referral + human-review queue
-- Supports the "Make the Call" router's two secondary actions.
-- Compare-chapters + human-review are HONEST STUBS: they record intent
-- (directory listing, consent-gated referral, review request) but there is
-- no automated placement decision and only DBOA is an integrated chapter.
-- ============================================================

-- Directory / routing metadata on chapters
alter table public.chapter add column if not exists is_integrated boolean not null default false;
alter table public.chapter add column if not exists is_routing_active boolean not null default false;
alter table public.chapter add column if not exists recruitment_url text;
alter table public.chapter add column if not exists contact_email text;
alter table public.chapter add column if not exists coverage_note text;

-- DBOA is the one integrated / active pathway during the pilot
update public.chapter
   set is_integrated = true, is_routing_active = true
 where slug = 'dboa' or name ilike '%DBOA%' or name ilike '%Dallas Basketball%';

-- Consent-gated referral to a non-integrated chapter
create table if not exists public.referral_record (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.person(id),
  chapter_id uuid references public.chapter(id),
  consent boolean not null default false,
  status text not null default 'pending',
  note text,
  created_at timestamptz not null default now()
);
alter table public.referral_record enable row level security;

-- Human-review queue ("Request human review" on the router)
create table if not exists public.review_request (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.person(id),
  reason text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.review_request enable row level security;

-- ------------------------------------------------------------
-- Public chapter directory (for the "Compare other chapters" screen)
-- ------------------------------------------------------------
create or replace function public.list_chapters_directory()
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_rows jsonb;
begin
  select coalesce(jsonb_agg(r order by (r->>'is_integrated')::boolean desc, r->>'name'), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'region', c.region,
      'is_integrated', c.is_integrated,
      'recruitment_url', c.recruitment_url,
      'contact_email', c.contact_email,
      'coverage_note', c.coverage_note
    ) as r
    from chapter c
  ) q;
  return v_rows;
end $$;

-- ------------------------------------------------------------
-- Record a consent-gated referral to another chapter (STUB: records intent only)
-- ------------------------------------------------------------
create or replace function public.create_referral(
  p_token uuid,
  p_chapter_id uuid,
  p_consent boolean
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_person uuid;
begin
  select person_id into v_person from registration_cycle where access_token = p_token;
  if v_person is null then raise exception 'We could not identify you — open your registration link first'; end if;
  if p_consent is not true then
    return jsonb_build_object('ok', false, 'reason', 'consent_required');
  end if;
  insert into referral_record(person_id, chapter_id, consent, status)
  values (v_person, p_chapter_id, true, 'pending');
  return jsonb_build_object('ok', true);
end $$;

-- ------------------------------------------------------------
-- File a human-review request (STUB: enqueues; a coordinator reviews out-of-band)
-- ------------------------------------------------------------
create or replace function public.request_chapter_review(
  p_token uuid,
  p_reason text default null
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_person uuid;
begin
  select person_id into v_person from registration_cycle where access_token = p_token;
  if v_person is null then raise exception 'We could not identify you — open your registration link first'; end if;
  insert into review_request(person_id, reason, status) values (v_person, p_reason, 'open');
  return jsonb_build_object('ok', true);
end $$;
