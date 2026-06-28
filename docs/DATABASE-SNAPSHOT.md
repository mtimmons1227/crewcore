# CrewCore — DATABASE SNAPSHOT (verified live)
**Project:** `nfcmesyfijtnrsdhypqn` · **Captured:** 2026-06-27 directly from the live Supabase database.
This is ground truth. Any new session can re-run these checks against the live DB to confirm nothing drifted.

---

## Migrations applied (11)

| version | name |
|---|---|
| 20260619011113 | slice1_recruit_core_schema |
| 20260619021454 | add_chapter_slug |
| 20260619053826 | add_chapter_display_fields |
| 20260619193203 | command_center_auth_and_recruiter_rls |
| 20260619201720 | lockdown_internal_rls_helper_functions |
| 20260619215722 | slice2_registration_clearance_engine |
| 20260619223447 | slice2_self_serve_registration_rpcs |
| 20260619223612 | lockdown_slice2_internal_functions |
| 20260621180834 | slice2_clearance_passfail_and_cycle_person_read |
| 20260627182800 | add_workflow_step_authority |
| 20260627231447 | add_chapter_logo_url |

---

## Tables & columns (public schema, 10 base tables)

**sport** — id (uuid pk), name (text), created_at
**association** — id (uuid pk), name (text), created_at
**chapter** — id (uuid pk), name (text), state_association_id (uuid), region (text), branding (jsonb '{}'), created_at, slug (text), tagline (text), hero_text (text), accent_color (text), logo_url (text)
**person** — id (uuid pk), full_name (text), email (text), phone (text), home_location (text), created_at, auth_user_id (uuid)
**membership** — id (uuid pk), person_id (uuid), chapter_id (uuid), sport_id (uuid), role (text), status (text 'lead'), joined_at, created_at, division (text)
**lead** — id (uuid pk), person_id (uuid), chapter_id (uuid), sport_id (uuid), source (text), score (numeric), dropoff_risk (text), stage (text 'recruit'), created_at
**season** — id (uuid pk), name (text), sport_id (uuid), association_id (uuid), starts_on (date), ends_on (date), created_at
**workflow_step** — id (uuid pk), chapter_id (uuid), sport_id (uuid), name (text), sort_order (int), step_type (text), cadence (text 'annual'), required (bool true), prerequisite_step_id (uuid), completion_mode (text 'self_report'), config (jsonb '{}'), created_at, authority (text 'chapter')
**registration_cycle** — id (uuid pk), person_id (uuid), chapter_id (uuid), sport_id (uuid), season_id (uuid), member_type (text), status (text 'in_progress'), clearance_level (text 'none'), cleared_at, access_token (uuid gen_random_uuid()), created_at
**step_completion** — id (uuid pk), cycle_id (uuid), workflow_step_id (uuid), status (text 'available'), due_at, completed_at, verified_by_person_id (uuid), evidence_url (text), data (jsonb '{}'), attempts (int 0), created_at, updated_at

---

## Functions (8, all SECURITY DEFINER)

| function | args | callable by |
|---|---|---|
| submit_lead | p_chapter_id, p_full_name, p_phone, p_email, p_sport_id, p_source | **anon** + authenticated + public |
| start_registration | p_email, p_chapter_id, p_sport_id, p_season_id, p_member_type | **anon** + authenticated |
| get_registration | p_token | **anon** + authenticated |
| complete_step | p_token, p_step_id, p_data | **anon** + authenticated |
| recompute_cycle_clearance | p_cycle_id | service_role only |
| tg_step_completion_cascade | (trigger) | service_role only |
| current_person_id | — | authenticated only |
| current_user_chapter_ids | — | authenticated only |

---

## RLS policies

| table | policy | cmd | roles |
|---|---|---|---|
| association | public read association | SELECT | public |
| chapter | public read chapter | SELECT | public |
| sport | public read sport | SELECT | public |
| season | public read seasons | SELECT | anon, authenticated |
| workflow_step | public read workflow steps | SELECT | anon, authenticated |
| lead | staff read chapter leads | SELECT | authenticated |
| membership | read own memberships | SELECT | authenticated |
| person | read own person | SELECT | authenticated |
| person | staff read chapter cycle persons | SELECT | authenticated |
| person | staff read chapter lead persons | SELECT | authenticated |
| registration_cycle | staff manage chapter cycles | ALL | authenticated |
| step_completion | staff manage chapter step completions | ALL | authenticated |

---

## DBOA workflow config (verified, step by step)

1. **Chapter application & dues** — payment / annual / required / staff_verify / chapter.
   config.pricing: new $125; returning $125 until 2026-04-01 then $175; transfer $175 (requires_documentation "from previous chapter"). external_url thedboa.com/join.
2. **THSBOA state registration & dues** — external_confirm / annual / required / self_report / state.
   config: ArbiterSports, external_url app.arbitersports.com/registration/official?org=6577&role=3; new $70; returning $70 until 2026-06-30 then $110; nonrefundable.
3. **Receive NFHS Rulebook & Case Book** — acknowledgment / annual / required / self_report / state. materials: NFHS Rulebook, Case Book.
4. **Receive NFHS Mechanics Manual** — acknowledgment / **biennial** / required / self_report / state. distributed_by division_rep.
5. **THSBOA state test** — assessment / annual / required / self_report / state. thresholds: regular_season 70, playoffs 90; ArbiterSports.
6. **Background check & abuse-prevention training** — credential / annual / required / self_report / state. note "physical not required"; required_by THSBOA.
7. **DBOA training camp** — attendance / **biennial** / required / staff_verify / chapter. fee $75; dates 2026-07-17/18/19; two- & three-person; deadline 2026-07-01; JotForm signup.
8. **Required off-season training (new / 2nd-year / Div IV-V)** — attendance / annual / **required=false** / staff_verify / chapter. location Walnut Hill ILA; required_for new, second_year, IV, V.

---

## Seeded entities & data counts

- Chapter: **DBOA - Dallas Basketball Officials Association**, slug `DBOA`, accent `#0d9488`, logo_url `https://nfcmesyfijtnrsdhypqn.supabase.co/storage/v1/object/public/chapter-logos/dboa-logo.png`
- Association: **THSBOA - Texas High School Basketball Officials Association**
- Season: **2026-27 Basketball Season**
- Sport: Basketball
- Counts: chapter 1 · sport 1 · season 1 · person 3 · lead 4 · workflow_step 8 · registration_cycle 2 · step_completion 16
- auth.users: 1 (`marv_timmons@yahoo.com`)

## Storage
- Public bucket `chapter-logos`; DBOA logo at `dboa-logo.png`.

## Extensions
- **pgvector NOT installed** (enable before AI/RAG work).

---
## Re-verify command (any session with DB access)
Run a `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;` — should return the 11 rows above. Then `list_tables` (10 base tables) and `SELECT sort_order, name FROM workflow_step ORDER BY sort_order;` (8 DBOA steps). If those match, the backend is intact.
