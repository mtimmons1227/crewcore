-- Command Center: link auth users to people + recruiter/chapter_admin lead read RLS
alter table person add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

create or replace function public.current_user_chapter_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select m.chapter_id from membership m
  join person p on p.id = m.person_id
  where p.auth_user_id = auth.uid() and m.role in ('recruiter','chapter_admin');
$$;
grant execute on function public.current_user_chapter_ids() to authenticated;

create or replace function public.current_person_id()
returns uuid language sql security definer stable set search_path = public as $$
  select id from person where auth_user_id = auth.uid() limit 1;
$$;
grant execute on function public.current_person_id() to authenticated;

drop policy if exists "staff read chapter leads" on lead;
create policy "staff read chapter leads" on lead for select to authenticated
using (chapter_id in (select public.current_user_chapter_ids()));

drop policy if exists "read own person" on person;
create policy "read own person" on person for select to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "staff read chapter lead persons" on person;
create policy "staff read chapter lead persons" on person for select to authenticated
using (exists (select 1 from lead l where l.person_id = person.id and l.chapter_id in (select public.current_user_chapter_ids())));

drop policy if exists "read own memberships" on membership;
create policy "read own memberships" on membership for select to authenticated
using (person_id in (select id from person where auth_user_id = auth.uid()));
