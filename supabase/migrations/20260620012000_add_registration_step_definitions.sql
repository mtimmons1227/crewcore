-- CrewCore Recruit — Slice 2 onboarding schema
-- Add configurable registration step definitions for the onboarding workflow.

create table if not exists registration_step (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sort_order int not null default 0,
  completion_mode text not null default 'self_report' check (completion_mode in ('self_report','staff_verify','locked')),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_registration_step_name on registration_step(lower(name));

alter table registration_step enable row level security;

create policy "public read registration steps" on registration_step for select using (true);
