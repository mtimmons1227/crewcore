-- CrewCore Recruit — Slice 2 onboarding schema
-- Add registration cycles for recruit onboarding progress tracking.

create table if not exists registration_cycle (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references lead(id) on delete cascade,
  chapter_id uuid not null references chapter(id) on delete cascade,
  current_step text,
  started_at timestamptz not null default now(),
  status text not null default 'in_progress' check (status in ('in_progress','completed','cancelled')),
  cleared_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_registration_cycle_lead on registration_cycle(lead_id);
create index if not exists idx_registration_cycle_chapter on registration_cycle(chapter_id);

alter table registration_cycle enable row level security;

create policy "recruiter read registration cycles" on registration_cycle for select using (true);
