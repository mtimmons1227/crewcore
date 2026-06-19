# Data Model

## Auth-mapped people and recruiter access

- `person.auth_user_id` links a Supabase auth account to a `person` record.
- This mapping is the mechanism that allows a staff login to be resolved to a person identity.
- The `recruiter` membership role is the key mechanism that grants Command Center visibility.
- Logged-in staff with `recruiter` or `chapter_admin` membership can read leads for their chapters.

## Migration ledger

The current DB-tracked versions and local migration files are:

- `20260619011113 slice1_recruit_core_schema` → local file `supabase/migrations/20260618212707_slice1_recruit_core_schema.sql`
- `20260619021454 add_chapter_slug` → local file `supabase/migrations/20260618213000_add_chapter_slug.sql`
- `20260619053826 add_chapter_display_fields` → local file `supabase/migrations/20260619053500_add_chapter_display_fields.sql`
- `20260619193203 command_center_auth_and_recruiter_rls` → local file `supabase/migrations/20260619121500_add_person_auth_user_id_and_recruiter_rls.sql`
- `20260619201720 lockdown_internal_rls_helper_functions` → local file `supabase/migrations/20260619201720_lockdown_internal_rls_helper_functions.sql`

> Note: local filenames and timestamps currently drift from the DB-tracked version identifiers. This is a known, low-priority cleanup item.

## Security posture

- Anonymous users may only call `submit_lead`.
- Internal helper functions such as `current_person_id()` and `current_user_chapter_ids()` are locked to authenticated users.
- Remaining Supabase advisor warnings are accepted for development and tracked in the pre-launch runbook.
- The current dev posture accepts that authenticated users must call helper functions and `submit_lead`, while the public surface is minimized.
