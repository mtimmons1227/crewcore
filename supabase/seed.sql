-- ============================================================================
-- DBOA basketball onboarding workflow — CANONICAL SEED (11 steps + dependencies)
-- Generated from the live database 2026-06-28. Matches production exactly.
--
-- ⚠️  REPO-ONLY — NEVER RUN THIS AGAINST THE LIVE/PRODUCTION DATABASE. ⚠️
--     It DELETEs and rebuilds workflow_step for the DBOA chapter. On a database
--     that has recruits, that cascade-deletes their step_completion progress.
--     This file exists ONLY so a FRESH/EMPTY build reproduces the workflow.
--     The live database is already correct; do not "re-apply" this to sync it.
--
-- Safe to run only when: building a new environment from scratch, or on a
-- branch/local DB with no registration_cycle data for DBOA.
-- ============================================================================
DO $$
DECLARE
  v_chapter uuid := (SELECT id FROM chapter WHERE slug='DBOA');
  v_sport   uuid := (SELECT id FROM sport WHERE name='Basketball');
BEGIN
  IF v_chapter IS NULL OR v_sport IS NULL THEN
    RAISE EXCEPTION 'DBOA chapter or Basketball sport not seeded yet — run base seed first.';
  END IF;

  -- Guard: refuse to run if recruits already exist (prevents the production wipe)
  IF EXISTS (
    SELECT 1 FROM registration_cycle WHERE chapter_id = v_chapter
  ) THEN
    RAISE EXCEPTION 'Aborting: DBOA already has registration_cycle data. This seed is for fresh builds only.';
  END IF;

  DELETE FROM workflow_step WHERE chapter_id = v_chapter;

  INSERT INTO workflow_step
    (chapter_id, sport_id, name, sort_order, step_type, cadence, required, completion_mode, authority, config) VALUES
    (v_chapter, v_sport, 'Chapter application & dues', 1, 'payment', 'annual', true, 'staff_verify', 'chapter',
      '{"due":{"type":"relative","days":7},"external_url":"https://www.thedboa.com/join","pricing":[{"member_type":"new","amount":125},{"member_type":"returning","amount":125,"until":"2026-04-01"},{"member_type":"returning","amount":175,"from":"2026-04-01"},{"member_type":"transfer","amount":175,"requires_documentation":"from previous chapter"}]}'::jsonb),
    (v_chapter, v_sport, 'THSBOA state registration & dues', 2, 'external_confirm', 'annual', true, 'self_report', 'state',
      '{"external_system":"ArbiterSports","external_url":"https://app.arbitersports.com/registration/official?org=6577&role=3","nonrefundable":true,"pricing":[{"member_type":"new","amount":70},{"member_type":"returning","amount":70,"until":"2026-06-30"},{"member_type":"returning","amount":110,"until":"2026-12-31"}]}'::jsonb),
    (v_chapter, v_sport, 'Background check & abuse-prevention training', 3, 'credential', 'annual', true, 'self_report', 'state',
      '{"required_by":"THSBOA","note":"physical not required"}'::jsonb),
    (v_chapter, v_sport, 'DBOA new officials training', 4, 'attendance', 'annual', false, 'staff_verify', 'chapter',
      '{"required_for":["new"]}'::jsonb),
    (v_chapter, v_sport, 'Purchase uniform', 5, 'payment', 'one_time', false, 'staff_verify', 'chapter',
      '{"required_for":["new"],"note":"DBOA uniform required before working games"}'::jsonb),
    (v_chapter, v_sport, 'Attend 6 general session meetings', 6, 'attendance', 'annual', true, 'staff_verify', 'chapter',
      '{"count_required":6}'::jsonb),
    (v_chapter, v_sport, 'Receive NFHS Rulebook & Case Book', 7, 'acknowledgment', 'annual', true, 'self_report', 'state',
      '{"materials":["NFHS Rulebook","NFHS Case Book"]}'::jsonb),
    (v_chapter, v_sport, 'Receive NFHS Mechanics Manual', 8, 'acknowledgment', 'biennial', true, 'self_report', 'state',
      '{"materials":["NFHS Mechanics Manual"],"distributed_by":"division_rep"}'::jsonb),
    (v_chapter, v_sport, 'THSBOA state test', 9, 'assessment', 'annual', true, 'self_report', 'state',
      '{"external_system":"ArbiterSports","thresholds":{"regular_season":70,"playoffs":90}}'::jsonb),
    (v_chapter, v_sport, 'DBOA training camp', 10, 'attendance', 'biennial', true, 'staff_verify', 'chapter',
      '{"fee":75,"dates":["2026-07-17","2026-07-18","2026-07-19"],"formats":["two-person","three-person"],"registration_deadline":"2026-07-01","signup_url":"https://form.jotform.com/250974417141153"}'::jsonb),
    (v_chapter, v_sport, 'Required off-season training (new / 2nd-year / Div IV-V)', 11, 'attendance', 'annual', false, 'staff_verify', 'chapter',
      '{"location":"Walnut Hill International Leadership Academy","required_for":["new","second_year","IV","V"]}'::jsonb);

  -- Dependencies (prerequisite_step_id), wired by name
  UPDATE workflow_step w SET prerequisite_step_id = pre.id
  FROM (VALUES
    ('THSBOA state registration & dues',            'Chapter application & dues'),
    ('Background check & abuse-prevention training','Chapter application & dues'),
    ('DBOA new officials training',                 'THSBOA state registration & dues'),
    ('Attend 6 general session meetings',           'THSBOA state registration & dues'),
    ('Receive NFHS Rulebook & Case Book',           'Background check & abuse-prevention training'),
    ('Receive NFHS Mechanics Manual',               'THSBOA state registration & dues'),
    ('THSBOA state test',                           'Receive NFHS Mechanics Manual')
  ) AS dep(step_name, prereq_name)
  JOIN workflow_step pre ON pre.name = dep.prereq_name AND pre.chapter_id = v_chapter
  WHERE w.name = dep.step_name AND w.chapter_id = v_chapter;
END $$;
