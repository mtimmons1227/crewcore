# Implementation Plan

## Slice 1 = DONE (2026-06-19)

### Shipped in Slice 1
- Public lead capture form for chapter recruiting interest.
- Database schema for `sport`, `association`, `chapter`, `person`, `membership`, and `lead`.
- `submit_lead` security-definer RPC for anonymous lead submission.
- Staff auth via Supabase email/password login.
- Recruiter RLS so logged-in staff can only read leads for their chapters.
- Command Center leads list with authenticated access and a friendly empty state.

### Tested end-to-end
- Public lead capture form submission flows into the database.
- Staff auth flow allows recruiter sign in and session persistence.
- Command Center `/command` renders only scoped leads for the recruiter.
- Verified exact DBOA lead visibility for Lawrence Daniels and Marvin Timmons.
- Confirmed public form → DB → secure Command Center path with RLS enforcement.
- Ran the Supabase security advisor and hardened internal helper function access.
