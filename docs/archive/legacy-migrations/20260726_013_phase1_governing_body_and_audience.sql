-- 013 — Phase 1 foundation: governing-body seam + member-type audience on steps.

-- 1) governing_body entity (the seam that makes multi-body / multi-state work later)
create table if not exists public.governing_body (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  state text,
  integration_type text not null default 'none',   -- arbiter | intra_focus | none
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.governing_body (name, short_name, state, integration_type)
select v.name, v.short_name, v.state, v.integration_type
from (values
  ('THSBOA', 'THSBOA', 'TX', 'arbiter'),
  ('Texas Association of Sports Officials', 'TASO', 'TX', 'intra_focus')
) v(name, short_name, state, integration_type)
where not exists (select 1 from public.governing_body gb where gb.short_name = v.short_name);

-- 2) chapter + registration_cycle seams
alter table public.chapter add column if not exists governing_body_id uuid references public.governing_body(id);
alter table public.chapter add column if not exists state text;
alter table public.registration_cycle add column if not exists governing_body_id uuid references public.governing_body(id);

update public.chapter
set governing_body_id = (select id from public.governing_body where short_name = 'THSBOA'),
    state = 'TX'
where slug = 'DBOA';

update public.registration_cycle rc
set governing_body_id = c.governing_body_id
from public.chapter c
where c.id = rc.chapter_id and rc.governing_body_id is null;

-- 3) member_type allowed values
alter table public.registration_cycle drop constraint if exists registration_cycle_member_type_check;
alter table public.registration_cycle add constraint registration_cycle_member_type_check
  check (member_type in ('new','returning','transfer','reinstating','add_sport'));

-- 4) step audience per member type (DBOA basketball) — common-case defaults from the Phase 1 matrix.
--    shape: {"member_types": [...]}. NULL/empty audience is treated as "applies to all".
--    NOTE: data migration scoped to the DBOA chapter id; when seeding chapters programmatically,
--    set audience at step-creation time instead of relying on this backfill.
update public.workflow_step ws
set audience = jsonb_build_object('member_types', to_jsonb(v.mt))
from (values
  ('Chapter application & dues',                               array['new','returning','transfer']),
  ('THSBOA state registration & dues',                         array['new','returning']),
  ('Background check & abuse-prevention training',             array['new','returning']),
  ('DBOA new officials training',                              array['new']),
  ('Purchase uniform',                                         array['new','transfer']),
  ('Attend 6 general session meetings',                        array['new','returning','transfer']),
  ('Receive NFHS Rulebook & Case Book',                        array['new','returning']),
  ('Receive NFHS Mechanics Manual',                            array['new','returning']),
  ('THSBOA state test',                                        array['new','returning']),
  ('DBOA training camp',                                       array['new','returning','transfer']),
  ('Required off-season training (new / 2nd-year / Div IV-V)', array['new','returning'])
) v(name, mt)
where ws.chapter_id = '14844f0c-5672-40c6-ae4e-0ec1b8a10679'
  and ws.name = v.name;
