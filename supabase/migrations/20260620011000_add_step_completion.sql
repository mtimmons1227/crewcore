-- CrewCore Recruit — Slice 2 onboarding schema
-- Add step completion records to track onboarding progress and dropout events.

create table if not exists step_completion (
  id uuid primary key default gen_random_uuid(),
  registration_cycle_id uuid not null references registration_cycle(id) on delete cascade,
  step_name text not null,
  status text not null default 'pending' check (status in ('pending','complete','dropout')),
  score numeric,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_step_completion_cycle on step_completion(registration_cycle_id);

alter table step_completion enable row level security;

create policy "recruiter read step completion" on step_completion for select using (true);
