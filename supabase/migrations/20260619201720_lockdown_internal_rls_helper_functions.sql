-- 20260619201720_lockdown_internal_rls_helper_functions
-- Applied to the live DB via Supabase MCP on 2026-06-19.
-- Locks internal RLS helper functions to signed-in users only.
-- submit_lead intentionally remains callable by anon (public lead capture).

revoke execute on function public.current_person_id() from public, anon;
revoke execute on function public.current_user_chapter_ids() from public, anon;

grant execute on function public.current_person_id() to authenticated;
grant execute on function public.current_user_chapter_ids() to authenticated;
