-- 011 — Security fix: recruits must NOT self-attest state-verified steps.
-- Flip the two Arbiter-confirmed steps off 'self_report' -> 'staff_verify' so the recruit UI
-- shows no "Mark done" button; only the arbiter-import pipeline (SECURITY DEFINER) completes them.
--
-- NOTE: this is a DATA migration scoped to the DBOA chapter. When seeding chapters
-- programmatically, prefer setting completion_mode correctly at step-creation time instead of
-- relying on this backfill.

update workflow_step
set completion_mode = 'staff_verify'
where chapter_id = '14844f0c-5672-40c6-ae4e-0ec1b8a10679'   -- DBOA
  and name in ('THSBOA state registration & dues',
               'Background check & abuse-prevention training')
  and completion_mode = 'self_report';
