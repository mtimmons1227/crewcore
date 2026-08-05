-- Surface open "request human review" submissions (from the Make-the-Call page) to
-- staff. Returns open review_request rows joined to the person, scoped to a chapter.
CREATE OR REPLACE FUNCTION public.get_open_review_requests(p_chapter_slug text DEFAULT 'DBOA')
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', rr.id,
      'full_name', p.full_name,
      'email', p.email,
      'reason', rr.reason,
      'created_at', rr.created_at
    ) ORDER BY rr.created_at DESC
  ), '[]'::jsonb)
  FROM review_request rr
  JOIN person p ON p.id = rr.person_id
  WHERE rr.status = 'open'
    AND EXISTS (
      SELECT 1 FROM registration_cycle rc
      JOIN chapter c ON c.id = rc.chapter_id
      WHERE rc.person_id = rr.person_id AND c.slug = p_chapter_slug
    );
$$;
GRANT EXECUTE ON FUNCTION public.get_open_review_requests(text) TO anon, authenticated;
