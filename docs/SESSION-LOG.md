# CrewCore — SESSION LOG
**This is the carry-forward file. Upload it (with `CrewCore-MASTER-BRIEF.md`) to start any new session.**
**Opener to paste:** *"Continue CrewCore. Read these, verify against Supabase `nfcmesyfijtnrsdhypqn`, pick up the open items."*

Keep this file in the repo at `docs/SESSION-LOG.md`. At the end of each session, update the "Latest session" block and commit. One file out, one file in.

---

## 30-second status
- **Built & working:** Slices 1 & 2 — lead capture, self-serve registration + magic-link timeline, tiered clearance engine, staff Command Center with expand-detail roster. Full app restyled: navy header, white cards, slate text throughout. Recruit timeline (`/r/:token`) shows per-step authority colors (emerald = DBOA chapter, blue = THSBOA state), due dates, and "Stalled" indicator. Command Center shows due-date-based stalled status (rose badge) and STALLED tile count. DBOA workflow expanded to 11 steps.
- **Database:** healthy — 11 workflow steps (expanded from 8, reordered), 2 demo recruits in live DB (remove after board demo). Pending: push migration `20260628000000_expose_due_at_in_get_registration.sql` to activate due-date display (`npx supabase db push --project-ref nfcmesyfijtnrsdhypqn`).
- **Pricing:** DECIDED (pending board validation) — $5/official ($4 DBOA founding) + 10% of first-year dues (new or transfer), Dec-31 cutoff.
- **Next build:** Slice 3 — Stripe auto-payment (scoped: Checkout → webhook → Edge Function → auto-complete chapter-dues step). Gated on board demo.
- **Highest-value move:** demo to DBOA board + validate pricing (off-keyboard).

## Key facts (quick reference)
- Repo: `C:\Users\marv_\projects\crewcore` · GitHub `github.com/mtimmons1227/crewcore`
- Supabase ref `nfcmesyfijtnrsdhypqn` · anon key `sb_publishable_-X_pCLhWWEvfToVCJ-Byig__u95p9d5`
- Staff login `marv_timmons@yahoo.com` · Dev: `cd apps/web; npm run dev` (look for "VITE", not "next-server"/EarnedHome)
- Routes: `/` lead page, `/r/:token` recruit menu, `/command` Command Center

## Open items
1. **DBOA board demo + pricing validation** — highest value, off-keyboard. Materials: board one-pager PDF + founding-agreement PDF (regenerate if links expired).
2. **Push `get_registration` migration to live DB** (blocked last session — MCP classifier flagged as production deploy): `npx supabase db push --project-ref nfcmesyfijtnrsdhypqn`. This activates per-step due-date chips and the "Stalled" header badge on the recruit page.
3. **Remove demo recruits after board demo:** "Jordan Sample (demo)" (fresh, gated) and "Riley Stalled (demo)" (backdated `due_at`, visibly stalled). Both exist in live DB now.
4. **Frontend (Claude Code):** flip lead capture page (`/`) from teal to navy/slate to match the rest of the app. (Recruit timeline restyle is done; lead page is the last teal holdout. Note `chapter.accent_color = #0d9488` is a second teal source.)
5. **Slice 3 — Stripe dues** (scoped): recruit pays chapter dues via Stripe Checkout → webhook → Supabase Edge Function → auto-completes the chapter-dues step (replaces manual staff verification). Next real build; gated on board reaction.
6. **Security before real users:** fix `start_registration` token disclosure (email → token); prevent `assessment`+`self_report` self-clearing to playoff; pre-launch hardening (leaked-password protection, `get_advisors`, off free tier, CAPTCHA/rate-limit public form).
7. **Docs:** keep MASTER-BRIEF + this log in `docs/`, committed each session.

## Ownership split (avoid the loop)
- **Web chat (here):** live database (verify/query/migrate), strategy, document generation. CANNOT see the repo/frontend code.
- **Claude Code (terminal):** the repo — frontend code, all docs, commits. CANNOT touch the DB the way the chat does.
- **You:** the running app (visual verification) + the board conversation.
- **Hard rules:** never `db reset`/`db push` at the live project; keep Supabase awake (free-tier pause → false-empty reads); build-passing ≠ works (verify in browser).

---

## Latest session — 2026-06-28

### What was built
- **RecruitMenuPage restyle** (three rounds, fully done): recruit timeline `/r/:token` now matches Command Center exactly — dark navy header with chapter logo, white `Card` surfaces, slate typography, neutral progress bars, no per-page custom CSS. Icon tiles are `rounded-xl` soft squares with step-type SVG icons (shirt for uniform, pencil for assessment, graduation cap for training, credit card for dues, etc.). Cadence labels lowercase; `count_required` steps show "6 required" not "annual."
- **Authority color bug fixed**: `get_registration` RPC doesn't return `authority`. Fixed by fetching `workflow_step(id, authority, prerequisite_step_id)` after the RPC and merging onto steps by `step_id` (`mergeAuthorityData()` helper). Emerald = DBOA chapter steps, blue = THSBOA state steps. Accent color ONLY on icon tile bg tint and authority chip — connector, progress bar, completed marker all neutral slate.
- **Due-date stalled status** (committed `2b17430`): added `due_at` to step rendering and stalled detection on both pages. Command Center: STATUS column rose "Stalled" badge; STALLED tile count now due-date-based. Recruit page: per-step "Due [date]" chip (slate), "Overdue · [date]" in rose if past. Stalled defined as: any `step_completion` with `due_at < now()` AND `status != 'complete'`. Replaces old 14-day inactivity heuristic.
- **Migration** `20260628000000_expose_due_at_in_get_registration.sql` committed — adds `sc.due_at` to `get_registration` RPC step output. **Pending push to live DB** (MCP deploy was blocked — run: `npx supabase db push --project-ref nfcmesyfijtnrsdhypqn`).

### Decisions made
- **Workflow expanded to 11 steps**: added DBOA new officials training, Purchase uniform, Attend 6 general session meetings. Steps reordered; background check moved up. Full dependency graph wired (e.g. state reg → chapter dues prerequisite; state test → mechanics manual; camp has no prereq).
- **Deadline policy**: Chapter dues due 7 days after registration — stored as `config.due = {type:"relative", days:7}` on that step; `due_at` set on `step_completion` at registration time. All other steps deadline-free until the chapter schedules them (`config.due = {type:"fixed", date:...}` — future config hook). A recruit is **Stalled** if any step's `due_at` is past and incomplete; otherwise **In progress**.
- **Slice 3 scoped for later** (not next sprint, post-demo): recruit pays chapter dues via Stripe Checkout → Stripe webhook → Supabase Edge Function → auto-completes the chapter-dues `step_completion` row (replacing manual staff verification). This is the recurring-revenue rail and makes the 10% success fee auto-enforceable.

### Demo data in live DB
Two clearly-labeled demo recruits: **"Jordan Sample (demo)"** (fresh, gated) and **"Riley Stalled (demo)"** (backdated `due_at`, visibly stalled on Command Center + recruit page). **Remove both after the board demo.**

### Next session, start here
Upload `CrewCore-MASTER-BRIEF.md` + this file → *"Continue CrewCore, verify against Supabase `nfcmesyfijtnrsdhypqn`, pick up the open items."* Priorities: (1) push DB migration, (2) board demo, (3) Stripe Slice 3 scope.

---

## Session — 2026-06-27 (handoff cleanup)
- Spent the session building a reliable handoff. **Regenerated all three handoff files** (this `SESSION-LOG.md`, `CrewCore-MASTER-BRIEF.md`, `DATABASE-SNAPSHOT.md`) **freshly verified against the live database** — full schema, all 8 functions + ACLs, every RLS policy, all 11 migrations, the complete DBOA workflow config with real pricing, chapter/association/season/storage state.
- Confirmed DB is fully intact (8 steps, 2 cycles, 16 completions, 4 leads, 1 auth user).
- Prior sessions (recap): SDLC docs were generated + reconciled in the repo (commits ~552b93d, 1ef4cbb); pricing finalized to $5/$4 + 10%; DBOA logo + `logo_url` added; theme tokens consolidated but lead page still teal (navy flip pending); `authority` field added.
