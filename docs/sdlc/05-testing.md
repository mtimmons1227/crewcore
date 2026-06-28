# Phase 5 — Testing
**Also known as (AI-era): Evaluation & Validation**
**Status: 🔄 In progress** — manual test matrix defined and partially executed; no automated suite yet.

---

## Purpose

Prove that each slice does what its design said — the capture flow works, clearance computes correctly, chapter data stays isolated under RLS, and recruits cannot do things they're not allowed to do. At current scale (one chapter, one operator), the testing approach is manual and browser-based. The test matrix here is the record of what has been verified and what is defined-but-pending.

---

## Process (repeatable)

1. Write the test cases before the slice ships — know what "correct" looks like before testing.
2. Execute each case manually: browser + Network tab for frontend calls; Supabase dashboard SQL editor for backend assertions.
3. Record what passed, what failed, and what the fix was.
4. Mark the slice's testing as verified once all defined cases pass.
5. Add automated coverage as the surface area grows to the point where manual testing is too slow.

---

## What we did on CrewCore Recruit

### Current approach

**Manual end-to-end verification** using the browser (Network tab for Supabase API calls) and the Supabase dashboard SQL editor for direct DB inspection. After any schema change or RPC update, the affected flows are exercised in the browser and the Network tab is inspected to confirm no 400 responses. DB state is verified with targeted SQL queries in the dashboard.

**No automated integration suite exists yet.** TypeScript type checking and `vite build` catch type errors and import errors. They do not catch wrong table names, wrong column names, or RLS policy gaps — those are runtime errors. The manual verification habit is the current backstop.

---

### Slice 1 — verified ✅

| Test | Method | Result |
|---|---|---|
| Public form loads chapter by slug | Browser: load `/` → network call to `chapter?slug=eq.DBOA` | Pass |
| Chapter branding renders (tagline, hero text, accent color) | Browser: visual check of rendered page | Pass |
| Lead submission creates `person` + `lead` records | Browser: submit form → confirm 200 from `submit_lead` RPC → check Supabase dashboard | Pass |
| Duplicate email doesn't create second `person` | Submit same email twice → assert single `person` row in DB | Pass |
| `person`, `membership`, `lead` locked down (no public SELECT) | Direct Supabase client call with `anon` key: `SELECT * FROM person` → assert 0 rows | Pass |
| Staff login gates the Command Center | Load `/command` without auth → assert redirect to login form | Pass |
| Recruiter sees only their chapter's leads | Log in as `marv_timmons@yahoo.com` (DBOA) → assert leads list only contains DBOA records | Pass |
| Migrations apply in order without error | All 5 Slice 1 migrations applied cleanly | Pass |

---

### Slice 2 — defined; verified for critical paths

#### Clearance test cases

These cases verify the tiered clearance algorithm. Each test sets up a `registration_cycle` with specific `step_completion` records and asserts the computed `clearance_level`.

| # | Scenario | Setup | Expected clearance |
|---|---|---|---|
| C-1 | Exam score below minimum | All required steps complete; exam score = 65 | `none` |
| C-2 | Exam score at regular threshold | All required steps complete; exam score = 70 | `regular` |
| C-3 | Exam score at playoff threshold | All required steps complete; exam score = 90 | `playoff` |
| C-4 | Exam score above playoff threshold | All required steps complete; exam score = 95 | `playoff` |
| C-5 | Required step missing, score = 90 | "Background check & abuse-prevention training" not complete; all other required steps done; exam score = 90 | `none` |
| C-6 | Optional step missing, score = 70 | All required steps complete; "Required off-season training" (`required = false`) not done; exam score = 70 | `regular` (optional step doesn't block) |
| C-7 | Step not applicable to member type | Returning official: "DBOA training camp" applies only to new officials in this season; step absent from cycle; all applicable required steps done; exam score = 70 | `regular` (inapplicable step doesn't block) |
| C-8 | No exam score at all | All required steps complete; no exam step_completion record | `none` |

**Status: C-1 through C-4 verified in browser with sample recruits. C-5 through C-8 defined; pending verification with test data.**

#### RPC guard tests

These cases verify that the RPCs enforce their access rules.

| # | Scenario | Call | Expected |
|---|---|---|---|
| G-1 | Advance a locked step | Call `complete_step` with a step whose prerequisites are incomplete | Rejected; step not yet available |
| G-2 | Self-report a `staff_verify` step as a recruit | Recruit calls `complete_step` via magic-link token for a `staff_verify` step (e.g., "Background check & abuse-prevention training") | Rejected; completion mode mismatch |
| G-3 | Staff completes a `self_report` step via authenticated session | Staff calls `complete_step` authenticated for a `self_report` step | Should succeed (staff can complete any step) |
| G-4 | Expired magic link token | Request `/r/:token` with a token past `expires_at` | Rejected; token expired response |
| G-5 | Invalid / nonexistent token | Request `/r/:token` with a made-up token | Rejected; token not found |
| G-6 | Staff advances step for another chapter's recruit | Staff user from chapter A calls advance for chapter B's recruit | Rejected; RLS violation |

**Status: G-4 and G-5 verified. G-1 through G-3 and G-6 defined; pending verification.**

#### RLS isolation checks

| # | Scenario | Assertion |
|---|---|---|
| R-1 | Staff in chapter A cannot read chapter B's leads | Log in as chapter A staff; query `lead`; assert zero results with `chapter_id = chapter_B_id` |
| R-2 | Staff in chapter A cannot read chapter B's registration cycles | Same user; query `registration_cycle`; assert all results have `chapter_id = chapter_A_id` |
| R-3 | Anon user cannot read any leads | Unauthenticated Supabase client; `SELECT * FROM lead`; assert 0 rows |
| R-4 | Anon user cannot read person records | Unauthenticated client; `SELECT * FROM person`; assert 0 rows |
| R-5 | Magic link gives no access beyond the recruit's own cycle | Fetch `/r/:token` for recruit A; assert no response data includes recruit B's records |

**Status: R-3 and R-4 verified (Slice 1 lockdown confirmed). R-1, R-2, R-5 defined; pending second-chapter test data.**

---

### In-browser / Network-tab verification habit

After every Supabase query change or schema change, verify in the browser:

1. Open Chrome DevTools → Network tab.
2. Exercise the affected page or action.
3. Find the Supabase API call (filter by `rest` or the Supabase URL).
4. Confirm HTTP 200 (or the expected response code).
5. Inspect the response body for the expected data shape.

A 400 response with a Postgres error in the body means a wrong table name, wrong column name, or RLS rejection. A 200 with an empty array when data is expected means an RLS policy is too restrictive or the query filter is wrong. Both must be investigated before marking the slice done.

---

### What to add in future slices

As the surface area grows, the manual approach becomes too slow. The following automated coverage should be added in Slice 3 or 4:

1. **Integration tests on the RPCs** — call each RPC with known inputs via the Supabase test client and assert the expected output and side effects. Use a separate test Supabase project or a local Supabase Docker stack.
2. **Seed / fixture data** — a repeatable seed script that creates test chapters, recruits, and registration cycles in known states so test cases are reproducible.
3. **CI pipeline** — run `tsc --noEmit` and `vite build` on every PR to catch type and build errors before they reach the live DB.
4. **RLS isolation tests** — scripted API calls as both a chapter A user and a chapter B user, asserting the correct data scope on every authenticated read.
5. **Clearance algorithm unit tests** — pure function tests on the clearance computation logic, independent of the DB.

---

## AI's role in this phase

**Maturity: AI-Assisted.** AI helped define the test matrix — particularly the clearance test cases (C-1 through C-8) and the RPC guard tests (G-1 through G-6) — and identified the RLS isolation cases. The human is the acceptance authority: whether chapter-sovereignty guarantees and data-isolation guarantees actually hold is a human judgment, not a model output. AI will scaffold automated tests for Slice 3 when that work begins.

---

## Key artifacts

- `supabase/migrations/*` — the RLS policies under test.
- [`../SESSION-LOG.md`](../SESSION-LOG.md) — records verification results per slice and standing gotchas.
- Supabase dashboard (project `nfcmesyfijtnrsdhypqn`) — SQL editor for DB-state assertions.
- See the [artifact index](../artifacts/README.md).

---

**Status: 🔄 In progress.** Critical path tests for Slice 1 verified. Clearance cases C-1 through C-4 verified for Slice 2. Remaining Slice 2 cases (C-5 through C-8, G-1 through G-6 except G-4/G-5, R-1/R-2/R-5) are defined and pending verification. No automated suite yet.
