# CrewCore — MASTER BRIEF
**Self-contained handoff. A new session can read this one file and know the whole project.**
**Verified against the live Supabase database on 2026-06-27. Project ref: `nfcmesyfijtnrsdhypqn`.**

> How to use this file in a new chat: upload this file + `SESSION-LOG.md`, then say:
> *"Continue CrewCore. Read these, verify against Supabase `nfcmesyfijtnrsdhypqn`, pick up the open items."*
> This chat (web) cannot read the local repo — but it CAN read the live database, so it can verify everything here.

---

## 1. What CrewCore is

CrewCore is a recruiting-and-onboarding SaaS for sports-officiating chapters — the "operating system for officials." It turns a stranger into a cleared, assignment-ready official, and gives the chapter a year-round system of record.

- **First market:** Dallas-area high-school basketball. First customer: **DBOA** (Dallas Basketball Officials Association), under **THSBOA** (Texas state body). Governance chain: **NFHS → UIL → THSBOA → DBOA**.
- **Strategic position:** CrewCore owns the **recruiting front door + onboarding/clearance**, and **feeds the chapter's existing assigner** (DBOA uses RefTown; NTBOA uses Arbiter). It does **not** compete with assigners — it integrates. RefTown is a *cost center* (~$5/official to schedule); CrewCore is a *profit center* (brings officials in).
- **CrowdIQ** (separate Pulse Media Group product): the invisible demand-generation engine — done-for-you paid-social recruiting that drives prospects to the CrewCore front door. Sold separately as a premium service; a chapter never sees the name "CrowdIQ." It is a human-delivered agency service today, NOT automated software (claims integrity: say "designed to use AI…", never "uses AI").
- **Ecosystem (future modules, not built):** Recruit (active) · Exchange · Academy · Payouts · Insights.

---

## 2. Build status (verified)

**BUILT & WORKING — Slices 1 & 2:**
- Public lead-capture page (`/`) → `submit_lead` RPC.
- Self-serve registration via magic-link token (`/r/:token`) → recruit onboarding timeline.
- Tiered clearance engine (regular ≥70 / playoff ≥90), auto-computed by trigger.
- Staff Command Center (`/command`): auth + recruit roster with detail panel, stalled/cleared flags, step checklist.
- DBOA seeded with the real 8-step workflow.
- `authority` field (chapter vs state) on workflow steps. DBOA logo hosted + `logo_url` rendered.
- Tailwind/EarnedHome restyle of the Command Center.

**Frontend stack:** Vite + React + TypeScript + Tailwind. App lives at `apps/web`. Three React pages: `LeadCapturePage.tsx`, `RecruitMenuPage.tsx` (`/r/:token`), `CommandCenterPage.tsx`.
*(Frontend code lives ONLY in the repo — this web chat cannot see it. Confirm frontend facts via Claude Code or by viewing the running app.)*

**NEXT BUILD — Slice 3: Dues collection (Stripe).** This is the recurring-revenue rail and makes the 10% success fee auto-enforceable.

**Canonical slice roadmap:**
1. ✅ Lead capture + Command Center
2. ✅ Registration/clearance + recruit timeline + roster
3. ⬜ Dues (Stripe Checkout / Connect) — **next**
4. ⬜ AI: lead scoring, drop-off prediction, reminders (generative first, then predictive, then agentic; "assistant not replacement")
5. ⬜ Workflow builder (drag-reorder, required toggle, applies-to, sandbox→publish, authority-aware change propagation) + recruit lifecycle (dormant/deferred/withdrawn/lapsed, separate Inactive view)
6. ⬜ Assigner hand-off (availability capture → push cleared official to RefTown/Arbiter)
7. ⬜ Returning-official renewals UI
8. ⬜ Mentor pairing + referral loop

---

## 3. Data model (10 tables, all verified live)

All chapter-scoped tables enforce isolation via RLS. Key tables:

- **sport** (id, name) — seeded: Basketball
- **association** (id, name) — seeded: THSBOA
- **chapter** (id, name, state_association_id, region, branding jsonb, slug, tagline, hero_text, accent_color, logo_url) — seeded: DBOA, slug `DBOA`, accent `#0d9488` (teal), logo_url set
- **person** (id, full_name, email, phone, home_location, auth_user_id) — the portable identity
- **membership** (id, person_id, chapter_id, sport_id, role, status, division, joined_at) — roles incl. recruiter/chapter_admin/division_rep
- **lead** (id, person_id, chapter_id, sport_id, source, score, dropoff_risk, stage) — stage default 'recruit'
- **season** (id, name, sport_id, association_id, starts_on, ends_on) — seeded: "2026-27 Basketball Season"
- **workflow_step** (id, chapter_id, sport_id, name, sort_order, step_type, cadence, required, prerequisite_step_id, completion_mode, config jsonb, authority) — the configurable onboarding unit
- **registration_cycle** (id, person_id, chapter_id, sport_id, season_id, member_type, status, clearance_level, cleared_at, access_token) — one person × chapter × season; `access_token` is the magic-link key
- **step_completion** (id, cycle_id, workflow_step_id, status, due_at, completed_at, verified_by_person_id, evidence_url, data jsonb, attempts) — per-cycle progress, timestamped

**Snapshot model:** when a recruit registers, `step_completion` rows are copied from the template — so editing a chapter's workflow does NOT retroactively change recruits already in flight (except where `authority='state'` justifies forced propagation).

**Current data:** 1 chapter, 1 sport, 1 season, 3 persons, 4 leads, 8 workflow steps, 2 registration cycles, 16 step completions, 1 auth user (`marv_timmons@yahoo.com`). No sample recruits (cleaned). Real recruits: Aaron Hill, Marvin Timmons.

---

## 4. Security model (verified)

- **Public read (anon):** sport, association, chapter, season, workflow_step.
- **Locked to authenticated + chapter-scoped:** lead, membership, person, registration_cycle, step_completion. Scoping via helper `current_user_chapter_ids()`.
- **8 functions, all SECURITY DEFINER, search_path=public:**
  - `submit_lead(p_chapter_id, p_full_name, p_phone, p_email, p_sport_id, p_source)` — **anon** — public lead capture
  - `start_registration(p_email, p_chapter_id, p_sport_id, p_season_id, p_member_type)` — **anon** — returns access_token
  - `get_registration(p_token)` — **anon** — token-scoped read of the recruit menu
  - `complete_step(p_token, p_step_id, p_data)` — **anon** — token-scoped self-complete of self_report steps
  - `recompute_cycle_clearance(p_cycle_id)` — service_role only
  - `tg_step_completion_cascade()` — trigger; unlocks dependents + recomputes clearance
  - `current_person_id()`, `current_user_chapter_ids()` — authenticated-only RLS helpers

**⚠️ Known security finding to revisit before launch (from a prior audit):** `start_registration` returns an existing cycle's `access_token` to anyone who supplies a (non-secret) email + public chapter/sport/season — i.e. an email is sufficient to obtain the magic-link token, enabling read of another official's data (`get_registration`) and tampering (`complete_step`). Also: a required `assessment` step is `self_report`, so a self-reported `{"score":...}` can drive playoff clearance unverified. Fix path: deliver tokens out-of-band (email), and prevent `assessment`+`self_report` from auto-clearing. **Not blocking dev; must be addressed before real officials use it.** Also pre-launch: enable leaked-password protection, run `get_advisors`, move off free tier (so the project never pauses), CAPTCHA/rate-limit the public form.

---

## 5. Clearance algorithm

A cycle clears when all **required** steps are complete. `clearance_level`: `none` → `regular` (state-test score ≥ 70 + required steps done) → `playoff` (score ≥ 90). Thresholds live in the THSBOA-state-test step's `config.thresholds` (regular_season 70, playoffs 90). Trigger recomputes on every step change; a 65 stays `none`, 95 → `playoff`.

---

## 6. DBOA workflow (8 steps, verified — exact names & config)

| # | Name | type | cadence | required | mode | authority |
|---|------|------|---------|----------|------|-----------|
| 1 | Chapter application & dues | payment | annual | yes | staff_verify | chapter |
| 2 | THSBOA state registration & dues | external_confirm | annual | yes | self_report | state |
| 3 | Receive NFHS Rulebook & Case Book | acknowledgment | annual | yes | self_report | state |
| 4 | Receive NFHS Mechanics Manual | acknowledgment | **biennial** | yes | self_report | state |
| 5 | THSBOA state test | assessment | annual | yes | self_report | state |
| 6 | Background check & abuse-prevention training | credential | annual | yes | self_report | state |
| 7 | DBOA training camp | attendance | **biennial** | yes | staff_verify | chapter |
| 8 | Required off-season training (new / 2nd-year / Div IV-V) | attendance | annual | **no** | staff_verify | chapter |

**Real config details:** Step 1 dues: new $125; returning $125 until 2026-04-01 then $175; transfer $175 (requires documentation from previous chapter); link thedboa.com/join. Step 2 state dues via **ArbiterSports org 6577** (new $70; returning $70 until 2026-06-30 then $110; nonrefundable). Step 4 mechanics manual distributed by `division_rep`. Step 5 thresholds 70/90 via ArbiterSports. Step 6 "physical not required," required_by THSBOA. Step 7 camp fee $75, dates 2026-07-17/18/19, two- & three-person, deadline 2026-07-01, JotForm signup. Step 8 required for new/2nd-year/Div IV-V at Walnut Hill ILA.

---

## 7. Pricing model — DECIDED (pending board validation)

**CrewCore software, standalone (CrowdIQ priced separately):**
- **$5 / official / year** flat base, all officials. **$4 founding rate for DBOA.**
- **+ 10% of first-year dues** for any official in their **first year with the chapter** (new OR transfer), on dues actually paid, **year one only** — then they convert to the $5 base.
- **Calendar-year cutoff: December 31** for both roster count and the new-recruit determination. Recruits after Dec 31 count toward next year.
- **Billing:** annual invoice off a Dec-31 roster snapshot. 10% is invoice-based until **Slice 3 (Stripe)** puts CrewCore in the payment path, then it becomes auto-attributable.
- **Base-fee rationale:** the per-official base is a whole-roster, year-round platform fee — CrewCore walks **every** official (new and veteran) through onboarding/clearance each season, and it's each new official's **first experience with the chapter**. This justifies charging on the full roster, not just recruits. (Defuses "why charge on veterans?" — the system onboards them too.) Parity with RefTown (~$5/official), but a profit center vs. their cost center.

**Real DBOA dues (2026-27):** New $125 · Returning $175 (eff Apr 1) · Returning-from-inactive $175 · Transfer $175 · nonrefundable · register in RefTown/ArbiterSports.

**DBOA estimate:** ~300 × $4 = $1,200 base; e.g. 60 new × $125 × 10% = $750; heavy year ~$1,950, steady ~$1,200.

**CrowdIQ / managed recruiting:** separate premium service (ad spend + management + margin), per-engagement, not bundled, framework only. Funnel audit = free/low-cost wedge for chapters; the $7,500 PulseScore Audit stays a Pulse product for *business* clients.

---

## 8. Transfer model

What a transfer repeats depends on three dimensions: **authority** (chapter steps always repeat for the new chapter), **jurisdiction** (in-state transfer carries state credentials already satisfied this season; out-of-state repeats them under the new state), and **timing** (a mid-season transfer may waive window-bound steps like a camp that already happened). This is the credential-portability foundation of the future "officiating passport."

---

## 9. Open items / next actions

1. **Highest value (off-keyboard):** take the board one-pager + founding agreement + live demo to DBOA's board; get willingness-to-pay validation.
2. **Frontend (Claude Code):** flip lead page + recruit timeline from teal to navy/slate (Command Center theme) — note `chapter.accent_color` is stored teal `#0d9488`, a second source of teal; decide hardcoded-navy vs per-chapter theming. Confirm/build a dedicated staff login page (currently an inline gate on `/command`).
3. **Next build:** Slice 3 — Stripe dues. Gated on board reaction.
4. **Security (before real users):** fix `start_registration` token disclosure + assessment self-report clearance; pre-launch hardening checklist.
5. **Docs housekeeping:** keep this brief + `SESSION-LOG.md` in `docs/`, updated each session, committed by Claude Code.

---

## 10. Key facts

- **Repo:** `C:\Users\marv_\projects\crewcore` (on local Windows machine; off OneDrive). GitHub: `github.com/mtimmons1227/crewcore`.
- **Supabase project ref:** `nfcmesyfijtnrsdhypqn` · URL `https://nfcmesyfijtnrsdhypqn.supabase.co`
- **Publishable (anon) key:** `sb_publishable_-X_pCLhWWEvfToVCJ-Byig__u95p9d5` (safe in client; RLS-protected). Service-role key stays in dashboard, never in client.
- **Staff login:** `marv_timmons@yahoo.com` (only auth user; password set by user — reset via Supabase dashboard if forgotten; can't be read back).
- **Dev server:** `cd apps/web; npm run dev` → Vite (look for "VITE" in terminal, NOT "next-server" which is the separate EarnedHome app). Lead page `/`, recruit menu `/r/:token`, Command Center `/command`.
- **Storage:** public bucket `chapter-logos`, DBOA logo at `chapter-logos/dboa-logo.png`.
- **pgvector:** NOT installed (must enable before AI/RAG work).
- **Tool ownership split:** *this web chat* = live database (verify/query) + strategy + document generation; *Claude Code* (in terminal) = the repo (frontend code, docs, commits). **Never** run `db reset`/`db push` against the live project. Keep the Supabase project awake (free tier pauses → false-empty reads).
- **CrowdIQ source files** (NOT in this repo — re-upload if CrowdIQ comes up): `crowdiq_design.md`, `crowdiq_operating_guide.md`, `crowdiq_roadmap.md`, Pulse capabilities PDF.

---
*This brief is ground-truth as of 2026-06-27, verified directly against the live database. When in doubt, re-query Supabase `nfcmesyfijtnrsdhypqn` — the database never drifts; docs can.*
