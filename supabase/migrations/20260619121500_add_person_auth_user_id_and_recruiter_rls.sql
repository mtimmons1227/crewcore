-- CrewCore Recruit — add auth_user_id to person and recruiter/chapter_admin read policies
-- Applied to Supabase project: nfcmesyfijtnrsdhypqn (CrewCore)
--
-- Maps Supabase auth users to a Person record and gates lead reads so a logged-in
-- recruiter or chapter admin can only see leads for chapters they run.
-- NOTE: Already applied to the live database. This file is the repo record.
--   supabase/migrations/20260619121500_add_person_auth_user_id_and_recruiter_rls.sql

alter table person add column if not exists auth_user_id text unique;

create or replace function public.current_person_id()
returns uuid
language sql stable
as $$
  select id
  from person
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_chapter_ids()
returns setof uuid
language sql stable
as $$
  select m.chapter_id
  from membership m
  join person p on p.id = m.person_id
  where p.auth_user_id = auth.uid()
    and m.role in ('recruiter', 'chapter_admin');
$$;

create policy "recruiter/chapter_admin read lead" on lead
  for select using (
    auth.role() = 'authenticated'
    and chapter_id in (select * from public.current_user_chapter_ids())
  );

create policy "recruiter/chapter_admin read person" on person
  for select using (
    auth.role() = 'authenticated'
    and (
      auth_user_id = auth.uid()
      or id in (
        select l.person_id
        from lead l
        where l.chapter_id in (select * from public.current_user_chapter_ids())
      )
    )
  );

create policy "self read membership" on membership
  for select using (
    auth.role() = 'authenticated'
    and person_id = public.current_person_id()
  );
