-- 012 — Board roster "smart signals".
--   * "cleared to work" = the first-paid-game gate (steps flagged first_game_required), NOT all 11.
--   * "stalled" is time-based AND only counts steps the recruit can act on NOW (status='available'),
--     so future/locked/seasonal steps never make someone look behind.
--   * adds next_step, days_idle, open_now, overdue, cleared_to_work so the board is actionable.
-- Same single-arg signature -> grants + the frontend call are preserved.

create or replace function public.get_board_roster(p_chapter_slug text default 'DBOA')
returns jsonb
language sql
security definer
set search_path to 'public'
as $function$
with params as (select 5::int as stalled_days),  -- tune here: days idle before "stalled"
ch as (select id, slug, name from chapter where slug = p_chapter_slug limit 1),
cyc as (
  select rc.id as cycle_id, rc.person_id, rc.chapter_id, rc.member_type, rc.access_token,
         rc.created_at as cycle_created, p.full_name, p.email
  from registration_cycle rc
  join person p on p.id = rc.person_id
  where rc.chapter_id = (select id from ch)
),
step_agg as (
  select sc.cycle_id,
         count(*) as total_steps,
         count(*) filter (where sc.status = 'complete')  as complete_steps,
         count(*) filter (where sc.status = 'available')  as open_now,
         max(sc.completed_at) as last_completed,
         bool_or(sc.due_at is not null and sc.due_at < now() and sc.status <> 'complete') as overdue
  from step_completion sc
  join cyc on cyc.cycle_id = sc.cycle_id
  group by sc.cycle_id
),
fg as (  -- first-paid-game milestone steps
  select sc.cycle_id,
         count(*) as fg_total,
         count(*) filter (where sc.status = 'complete') as fg_done
  from step_completion sc
  join workflow_step ws on ws.id = sc.workflow_step_id
  join cyc on cyc.cycle_id = sc.cycle_id
  where (ws.config->>'first_game_required') = 'true'
  group by sc.cycle_id
),
next_step as (  -- lowest-order step they can act on right now
  select distinct on (sc.cycle_id) sc.cycle_id, ws.name as next_step_name
  from step_completion sc
  join workflow_step ws on ws.id = sc.workflow_step_id
  join cyc on cyc.cycle_id = sc.cycle_id
  where sc.status = 'available'
  order by sc.cycle_id, ws.sort_order
),
dues_step as (
  select sc.cycle_id, sc.status
  from step_completion sc
  join workflow_step ws on ws.id = sc.workflow_step_id
  join cyc on cyc.cycle_id = sc.cycle_id
  where ws.name ilike 'chapter application%dues%'
),
state_step as (
  select sc.cycle_id, sc.status as state_status
  from step_completion sc
  join workflow_step ws on ws.id = sc.workflow_step_id
  join cyc on cyc.cycle_id = sc.cycle_id
  where ws.step_type = 'external_confirm'
),
dues_money as (
  select person_id, sum(amount) filter (where status = 'paid') as amt
  from payment
  where chapter_id = (select id from ch) and type = 'dues'
  group by person_id
),
rows as (
  select
    cyc.full_name, cyc.email, cyc.member_type, cyc.access_token,
    coalesce(sa.total_steps,0)    as total_steps,
    coalesce(sa.complete_steps,0) as complete_steps,
    coalesce(sa.open_now,0)       as open_now,
    coalesce(sa.overdue,false)    as overdue,
    coalesce(sa.last_completed, cyc.cycle_created) as last_activity,
    floor(extract(epoch from now() - coalesce(sa.last_completed, cyc.cycle_created))/86400)::int as days_idle,
    (ds.status = 'complete')      as dues_paid,
    ss.state_status,
    ns.next_step_name,
    coalesce(fg.fg_total,0) as fg_total,
    coalesce(fg.fg_done,0)  as fg_done,
    (coalesce(fg.fg_total,0) > 0 and coalesce(fg.fg_done,0) = coalesce(fg.fg_total,0)) as cleared_to_work
  from cyc
  left join step_agg  sa on sa.cycle_id = cyc.cycle_id
  left join fg        on fg.cycle_id = cyc.cycle_id
  left join next_step ns on ns.cycle_id = cyc.cycle_id
  left join dues_step ds on ds.cycle_id = cyc.cycle_id
  left join state_step ss on ss.cycle_id = cyc.cycle_id
),
scored as (
  select r.*,
    case
      when r.total_steps > 0 and r.complete_steps = r.total_steps then 'complete'
      when not r.cleared_to_work and r.open_now > 0
           and r.days_idle > (select stalled_days from params) then 'stalled'
      else 'in_progress'
    end as status
  from rows r
)
select jsonb_build_object(
  'chapter', (select jsonb_build_object('slug', slug, 'name', name) from ch),
  'settings', jsonb_build_object('stalled_days', (select stalled_days from params)),
  'kpis', jsonb_build_object(
    'recruits',        (select count(*) from scored),
    'dues_paid',       (select count(*) from scored where dues_paid),
    'cleared',         (select count(*) from scored where status = 'complete'),
    'cleared_to_work', (select count(*) from scored where cleared_to_work),
    'attention',       (select count(*) from scored where status = 'stalled' or overdue),
    'stalled',         (select count(*) from scored where status = 'stalled'),
    'overdue',         (select count(*) from scored where overdue),
    'dues_collected',  round(coalesce((select sum(amt) from dues_money), 0) / 100.0, 2)
  ),
  'recruits', coalesce((
    select jsonb_agg(jsonb_build_object(
      'full_name', full_name,
      'email', email,
      'member_type', member_type,
      'access_token', access_token,
      'total_steps', total_steps,
      'complete_steps', complete_steps,
      'pct', case when total_steps > 0 then round(complete_steps::numeric * 100 / total_steps) else 0 end,
      'last_activity', last_activity,
      'days_idle', days_idle,
      'open_now', open_now,
      'next_step', next_step_name,
      'dues_paid', dues_paid,
      'state_status', state_status,
      'cleared_to_work', cleared_to_work,
      'fg_done', fg_done,
      'fg_total', fg_total,
      'overdue', overdue,
      'status', status
    ) order by (status = 'stalled') desc, cleared_to_work, complete_steps desc, full_name)
    from scored
  ), '[]'::jsonb)
);
$function$;

grant execute on function public.get_board_roster(text) to anon, authenticated;
