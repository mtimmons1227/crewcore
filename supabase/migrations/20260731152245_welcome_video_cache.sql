-- Caches one Synthesia render per (chapter, sport, season, member_type) so the same
-- personalized video is reused for every recruit on that path (org-level variables).
CREATE TABLE IF NOT EXISTS public.welcome_video (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapter(id) ON DELETE CASCADE,
  sport_id uuid NOT NULL REFERENCES public.sport(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.season(id) ON DELETE CASCADE,
  member_type text NOT NULL,
  synthesia_id text,
  status text NOT NULL DEFAULT 'in_progress',  -- in_progress | complete | failed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, sport_id, season_id, member_type)
);

ALTER TABLE public.welcome_video ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (the welcome-video edge function) reads/writes this.