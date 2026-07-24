-- ============================================================================
-- M1 test seed — run against a FRESH or DEV database only.
-- Adds the minimum records needed to exercise the recruit onboarding +
-- Stripe dues flow end-to-end. Assumes the base seed (seed.sql) and the
-- DBOA 11-step workflow are already in place.
--
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- Enable the Recruit module for DBOA
INSERT INTO chapter_module (chapter_id, module_key, enabled, config)
SELECT id, 'recruit', true, '{}'::jsonb
FROM chapter WHERE slug = 'DBOA'
ON CONFLICT (chapter_id, module_key) DO UPDATE SET enabled = true;

-- Test person — no real email needed for Stripe test-mode runs
INSERT INTO person (full_name, email, phone)
VALUES ('Test Recruit', 'test@crewcore.dev', '555-000-0001')
ON CONFLICT DO NOTHING;

-- Override dues amount on the chapter-dues step to $45 for test convenience.
-- create-dues-checkout reads config.fee first (amountFromConfig helper).
-- ⚠️  Remove "fee" from config before go-live — real amount is in config.pricing.
UPDATE workflow_step
SET config = config || '{"fee": 45}'::jsonb
WHERE chapter_id = (SELECT id FROM chapter WHERE slug = 'DBOA')
  AND step_type   = 'payment'
  AND sort_order  = 1
  AND (config->>'fee') IS NULL;
