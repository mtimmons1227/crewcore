# Legacy root-level migration files (archived)

These `.sql` files previously sat loose in the **repository root**. They are the original,
pre-sync migration drafts. They were moved here to declutter the root; **nothing was deleted.**

## Why they're here, not in `supabase/migrations/`

The authoritative migration set is `supabase/migrations/`, which was re-synced from the **live
database** (commit `63fdc15`, covering `refnet_015`→`027`, the attendance engine, and the sim
helpers). The live database is the true source of truth, and the app runs against it.

Content check performed before archiving (content hash + keyword scan):

| Root file | Status |
|---|---|
| `20260726_013_phase1_governing_body_and_audience.sql` | **Exact duplicate** of the file in `supabase/migrations/` |
| `20260726_014_start_registration_member_type_aware.sql` | **Exact duplicate** of the file in `supabase/migrations/` |
| `20260729_015_submit_lead_email_match_and_name_sync.sql` | Superseded — final version is `20260729233137_submit_lead_email_match_and_name_sync.sql` |
| `20260730_016_rulebook_mechanics_authority_chapter.sql` | Functionality represented in `supabase/migrations/` (book/authority migrations) |
| `20260730_018_welcome_video_watched.sql` | Represented (`welcome_video` migrations present) |
| `20260730_019_session_attendance_counts.sql` | Represented (attendance-engine migrations present) |
| `20260730_020_completion_authority_and_audit_source.sql` | Represented (`completion_authority_and_audit_source` present) |
| `20260730_022_welcome_video_cache.sql` | Superseded — final is `20260731152245_welcome_video_cache.sql` |

## ⚠️ Two items to VERIFY during the re-baseline

These two did not match by name in `supabase/migrations/`. Confirm the objects exist in the live
DB (they almost certainly do, since the app runs) and that a fresh rebuild would recreate them:

- `20260730_017_get_open_review_requests.sql` — the `get_open_review_requests` function was not
  found by name in `supabase/migrations/`. It may have been superseded by `list_verify_queue` /
  `request_chapter_review`; confirm before relying on a from-scratch rebuild.
- `20260730_021_step_source_and_uncomplete.sql` — the `uncomplete`/`step_source` helper was not
  found by name. The `source` concept is present in several migrations; confirm the uncomplete
  path specifically.

## Recommended permanent fix

Run a one-time **`supabase db pull`** to generate a clean baseline migration from the live
database. That makes `supabase/migrations/` complete and unambiguous, after which this archive is
purely historical and can be removed.
