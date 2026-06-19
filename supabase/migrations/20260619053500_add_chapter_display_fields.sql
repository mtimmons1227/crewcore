-- CrewCore Recruit — add per-chapter display fields for the public recruiting page
-- Applied to Supabase project: nfcmesyfijtnrsdhypqn (CrewCore)
--
-- The public lead-capture page reads tagline, hero_text, and accent_color per chapter.
-- NOTE: Already applied to the live database. This file is the repo record. Store at:
--   supabase/migrations/20260619053500_add_chapter_display_fields.sql

alter table chapter add column if not exists tagline text;
alter table chapter add column if not exists hero_text text;
alter table chapter add column if not exists accent_color text;

update chapter
set tagline = 'Become a Basketball Official',
    hero_text = 'DBOA is recruiting new basketball officials in the Dallas area. Get trained, get mentored, and get on the court.',
    accent_color = '#0d9488'
where slug = 'DBOA';
