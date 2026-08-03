-- ============================================================
-- Staff verification + book issuance (board tool backend)
-- Demo-grade: gated by the 'dboa2026' passcode (replace w/ real staff auth before go-live)
-- ============================================================

-- Audit trail for every staff verify/reject action
create table if not exists public.step_verification_audit (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.registration_cycle(id),
  workflow_step_id uuid not null references public.workflow_step(id),
  action text not null check (action in ('verify','reject')),
  actor_label text,
  note text,
  created_at timestamptz not null default now()
);
alter table public.step_verification_audit enable row level security;

-- Controlled book inventory: one row per (person, book_type); unique blocks duplicate sets
create table if not exists public.book_issuance (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.person(id),
  book_type text not null,
  workflow_step_id uuid references public.workflow_step(id),
  issued_by_label text,
  note text,
  issued_at timestamptz not null default now(),
  unique (person_id, book_type)
);
alter table public.book_issuance enable row level security;

-- ------------------------------------------------------------
-- Verify or reject a staff_verify step for one registration cycle
-- ------------------------------------------------------------
create or replace function public.staff_verify_step(
  p_passcode text,
  p_cycle_id uuid,
  p_workflow_step_id uuid,
  p_action text,
  p_actor_label text default null,
  p_note text default null
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_new_status text; v_sc public.step_completion%rowtype;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  if p_action not in ('verify','reject') then raise exception 'Unknown action'; end if;

  if p_action = 'verify' then
    update step_completion
       set status = 'complete', completed_at = now(), source = 'staff', updated_at = now()
     where cycle_id = p_cycle_id and workflow_step_id = p_workflow_step_id
       and status is distinct from 'complete'
     returning * into v_sc;
    if v_sc.id is null then
      -- already complete (idempotent) — return current row
      select * into v_sc from step_completion
        where cycle_id = p_cycle_id and workflow_step_id = p_workflow_step_id;
    end if;
    v_new_status := 'complete';
  else
    -- reject: send the step back to available so the official/staff can redo it
    update step_completion
       set status = 'available', completed_at = null, source = null, updated_at = now()
     where cycle_id = p_cycle_id and workflow_step_id = p_workflow_step_id
     returning * into v_sc;
    v_new_status := 'available';
  end if;

  insert into step_verification_audit(cycle_id, workflow_step_id, action, actor_label, note)
  values (p_cycle_id, p_workflow_step_id, p_action, p_actor_label, p_note);

  return jsonb_build_object('ok', true, 'status', v_new_status, 'cycle_id', p_cycle_id, 'workflow_step_id', p_workflow_step_id);
end $$;

-- ------------------------------------------------------------
-- Issue a book set: blocks duplicates, marks the matching step complete
-- ------------------------------------------------------------
create or replace function public.issue_book(
  p_passcode text,
  p_person_id uuid,
  p_book_type text,
  p_workflow_step_id uuid default null,
  p_issued_by_label text default null,
  p_note text default null
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_existing public.book_issuance%rowtype;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;

  select * into v_existing from book_issuance
   where person_id = p_person_id and book_type = p_book_type;
  if v_existing.id is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_issued',
      'book_type', p_book_type, 'issued_at', v_existing.issued_at,
      'issued_by', v_existing.issued_by_label);
  end if;

  insert into book_issuance(person_id, book_type, workflow_step_id, issued_by_label, note)
  values (p_person_id, p_book_type, p_workflow_step_id, p_issued_by_label, p_note);

  -- mark the linked book step complete for this person's active cycle(s)
  if p_workflow_step_id is not null then
    update step_completion sc
       set status = 'complete', completed_at = now(), source = 'staff_issue', updated_at = now()
      from registration_cycle rc
     where sc.cycle_id = rc.id and rc.person_id = p_person_id
       and sc.workflow_step_id = p_workflow_step_id
       and sc.status is distinct from 'complete';
  end if;

  return jsonb_build_object('ok', true, 'book_type', p_book_type, 'person_id', p_person_id);
end $$;

-- ------------------------------------------------------------
-- Pending staff_verify work queue for the board
-- ------------------------------------------------------------
create or replace function public.list_verify_queue(
  p_passcode text,
  p_chapter_id uuid default null
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_rows jsonb;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select coalesce(jsonb_agg(r order by r->>'full_name'), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'cycle_id', rc.id,
      'workflow_step_id', ws.id,
      'person_id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'step_name', ws.name,
      'member_type', rc.member_type,
      'status', sc.status
    ) as r
    from step_completion sc
    join workflow_step ws on ws.id = sc.workflow_step_id
    join registration_cycle rc on rc.id = sc.cycle_id
    join person p on p.id = rc.person_id
    where ws.completion_mode = 'staff_verify'
      and sc.status is distinct from 'complete'
      and (p_chapter_id is null or ws.chapter_id = p_chapter_id)
  ) q;
  return v_rows;
end $$;

-- ------------------------------------------------------------
-- Outstanding books: officials whose book step is not yet complete / not issued
-- ------------------------------------------------------------
create or replace function public.outstanding_books(
  p_passcode text,
  p_chapter_id uuid default null
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare v_rows jsonb;
begin
  if p_passcode is distinct from 'dboa2026' then raise exception 'Unauthorized'; end if;
  select coalesce(jsonb_agg(r order by r->>'full_name'), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'person_id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'book_step', ws.name,
      'workflow_step_id', ws.id,
      'cycle_id', rc.id
    ) as r
    from step_completion sc
    join workflow_step ws on ws.id = sc.workflow_step_id
    join registration_cycle rc on rc.id = sc.cycle_id
    join person p on p.id = rc.person_id
    where ws.name ilike '%NFHS%'
      and sc.status is distinct from 'complete'
      and (p_chapter_id is null or ws.chapter_id = p_chapter_id)
  ) q;
  return v_rows;
end $$;
