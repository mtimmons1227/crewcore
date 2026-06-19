-- CrewCore Recruit — add chapter.slug for clean per-chapter URLs
-- Applied to Supabase project: nfcmesyfijtnrsdhypqn (CrewCore)
--
-- Adds a URL-friendly slug to chapter (e.g. /DBOA) and tags the seeded DBOA chapter.
-- NOTE: Already applied to the live database. This file is the repo record. Store at:
--   supabase/migrations/20260618213000_add_chapter_slug.sql

alter table chapter add column if not exists slug text;

update chapter
set slug = 'DBOA'
where name = 'DBOA - Dallas Basketball Officials Association'
  and slug is null;

create unique index if not exists idx_chapter_slug on chapter(slug);
