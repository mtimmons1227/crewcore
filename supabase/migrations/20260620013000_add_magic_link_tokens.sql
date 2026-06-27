-- CrewCore Recruit — Slice 2 onboarding schema
-- Add magic link token records for recruit status page access.

create table if not exists magic_link_token (
  id uuid primary key default gen_random_uuid(),
  registration_cycle_id uuid not null references registration_cycle(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_magic_link_token_cycle on magic_link_token(registration_cycle_id);

alter table magic_link_token enable row level security;

create policy "public read magic link tokens" on magic_link_token for select using (true);
