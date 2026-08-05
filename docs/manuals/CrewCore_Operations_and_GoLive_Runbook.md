# CrewCore — Operations & Go-Live Runbook

**Product:** CrewCore (RefNet officiating ecosystem)
**Owner:** Timmons Sport Technologies
**Audience:** Whoever deploys, operates, and supports CrewCore
**Purpose:** How to deploy and run CrewCore day to day, what must be closed before real officials
and real money, and how to respond when something goes wrong.

> **Security note.** This runbook names secrets and environment variables but never contains their
> values. All keys and secrets live server-side (Supabase function secrets / Netlify env) and must
> never appear in the browser, a screenshot, or a document.

---

## 1. Environments

| Environment | URL | Branch | Notes |
|---|---|---|---|
| Production | `refnet-dboa.netlify.app` | `main` | Live demo today; becomes production at go-live |
| Staging | `staging--refnet-dboa.netlify.app` | `staging` | `VITE_SIMULATION_MODE=true` shows simulator panels |
| Database | Supabase project `nfcmesyfijtnrsdhypqn` | — | **Staging currently shares the production DB** — see go-live item D |
| Payments | Stripe | — | **Test/sandbox mode** (card `4242 4242 4242 4242`) |

**Important:** staging and production currently point at the **same** Supabase database. A
separate production database is a go-live requirement so that test/simulation actions can't touch
real records.

---

## 2. Deployment

### 2.1 Frontend (Netlify)

- **Build:** base `apps/web`, command `npm run build`, publish `dist`.
- **Routing:** a catch-all redirect (`/* → /index.html`, 200) serves the single-page app so deep
  links survive refresh. This lives in `netlify.toml`.
- **Branch deploys:** push to `main` → production build; push to `staging` → staging build.
  Netlify builds automatically on push.
- **Frontend env vars (Netlify):**
  - `VITE_SUPABASE_URL` — Supabase project URL.
  - `VITE_SUPABASE_ANON_KEY` — Supabase anon key.
  - `VITE_SIMULATION_MODE` — `true` on staging only (surfaces simulator panels).

  The app throws at startup if the Supabase URL or anon key is missing, so a broken env config
  fails fast rather than silently.

### 2.2 Backend (Supabase)

- **Migrations:** ordered SQL files in `supabase/migrations`. Apply new migrations to the project;
  never run `seed.sql` against the live database (it seeds a fresh DBOA workflow and is for clean
  builds only).
- **Edge functions:** `arbiter-import`, `create-dues-checkout`, `stripe-webhook`,
  `request-magic-link`, `welcome-video`. `stripe-webhook` runs with `verify_jwt=false` by design
  (it authenticates on the Stripe signature).
- **Server-side secrets (Supabase function secrets):**
  - `x-arbiter-secret` — gates the Arbiter import endpoint.
  - `RESEND_API_KEY` — transactional email.
  - `STRIPE_SECRET_KEY` — Stripe API key.
  - `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret.
  - `APP_URL` — the live site URL, so Stripe redirects land correctly.

### 2.3 Deploying a change (routine)

1. Make the change on a branch; push.
2. For a UI change: push to `staging`, verify on the staging URL, then merge/push to `main`.
3. For a DB change: add a migration and apply it to the Supabase project; deploy any affected edge
   function.
4. Confirm the Netlify deploy succeeded (deploy log) and smoke-test the affected screen.

---

## 3. Routine operations

### 3.1 Import the Arbiter roster (state records)

State-authority steps complete from the Arbiter import, not by hand.

- **Mechanism:** the `arbiter-import` edge function (HTTP, gated by `x-arbiter-secret`) accepts one
  official or an array and completes the **THSBOA state dues** and **background check** steps and
  sets clearance from eligibility. It is **idempotent** and case-insensitive on email.
- **Field mapping (Arbiter → CrewCore):** `THSBOA Dues Paid` → state registration & dues complete;
  `Background Check Cleared` → background check complete; `Regular Season Eligible` →
  `clearance_level = regular`; `Playoff Eligible` → `clearance_level = playoff`.
- **Current pipeline:** a Power Automate flow reads a roster file (Excel in OneDrive) and POSTs each
  official to the endpoint (built and tested end-to-end).
- **Cadence:** a **daily** scheduled import at launch (increase during the Jul–Oct rush). Optionally
  an on-demand "check my status" pull for a single official for instant-feel confirmation. Partner
  API (~5-min polling) is a later upgrade if DBOA is granted access.
- **Safety:** always keep the **manual override** (Board Verify) so a late or missing record never
  stalls a recruit.

### 3.2 Run a training session

See the User Manual, Part B4 (Session Admin → Kiosk → Session Attendance). Operationally: create
the session, run the kiosk at the venue, close attendance at the end.

### 3.3 Read logs & health

- **Supabase logs:** API (`/rest/v1/rpc/*`) and edge-function logs show request status; use them to
  confirm whether a request reached the server. (This is how the kiosk incident in §5.1 was
  diagnosed.)
- **Supabase advisors:** run the security and performance advisors regularly, especially after
  schema changes, and resolve findings.
- **Netlify:** deploy logs for build failures.

---

## 4. Go-Live checklist

Everything below is intentionally demo-grade today and **must be closed before real officials enter
real data or real money moves.** None are bugs; all are "fix before launch." Grouped by type.

### A. Security & access (do not onboard real recruits until closed)

- [ ] **Replace the `dboa2026` passcode with real staff authentication.** It currently gates the
      kiosk, session admin, close-session, and (historically) the board dashboard. A shared literal
      passcode in client-callable form is not real auth.
- [ ] **Recruit login → magic link.** Recruits reach their checklist via a long-lived `/r/<token>`
      link (possession = access). Move to identity-verified, expiring magic-link login with per-user
      RLS. Spec: `RefNet_MagicLink_Login_Spec.md` (additive).
- [ ] **Lock down the board dashboard (PII).** `/board` is passcode-gated and its roster RPC is
      granted to `anon` — anyone with the public anon key could pull names/emails/progress. Add a
      `board_member` role check + RLS and remove the anon grant. **Highest priority once real recruit
      data exists.**
- [ ] **Remove or hard-gate the demo/sim shortcuts.** `demo_load_thsboa` (fakes state verification)
      and the staging `sim_mark_paid` / `sim_complete_step` RPCs are token-callable. Remove them or
      lock them behind real staff auth and a non-production flag. (They share the prod DB today.)
- [ ] **Close the registration-link enumeration gap.** `start_registration` returns the access
      token to the browser; bind it to a session or require the emailed magic link.
- [ ] **Prevent self-clear-to-playoff.** Ensure an official can't self-clear into playoff
      eligibility; clearance comes only from the verified state-test path / Arbiter.
- [ ] **RLS audit.** Full pass so every tenant-scoped table (person, registration_cycle,
      step_completion, payment, domain_event, holds, …) enforces chapter/self isolation. Run
      Supabase advisors and resolve findings.
- [ ] **Attendance identity.** Check-in trusts a token in `localStorage` (fine for demo). Consider a
      stronger identity binding for real use.
- [ ] **Rotate the Resend API key** (briefly mishandled during debugging): create a fresh key,
      update only `RESEND_API_KEY`, revoke the old one.
- [ ] **Rotate the exposed Stripe test key** (appeared in a screenshot); moot once live keys replace
      it, but don't ship the old test key.

### B. Payments (before real money moves)

- [ ] **Flip Stripe to live mode.** Create live API keys and a live webhook endpoint (new
      `whsec_` signing secret → `STRIPE_WEBHOOK_SECRET`; update `STRIPE_SECRET_KEY`); re-test one
      small real charge end to end.
- [ ] **Confirm real dues amounts** per chapter (dues, returning/transfer tiers, dates). The
      `fee:45` test override is already removed.
- [ ] **Uniform step pricing.** "Purchase uniform" is a payment step with no price set; decide a
      price or mark it informational/paid-elsewhere.
- [ ] **Point `APP_URL` at the live site** so Stripe redirects land correctly.
- [ ] **Success banner reflects real state.** The recruit "Payment confirmed" banner is currently
      shown on `?payment=success` regardless of webhook processing; make it read actual state.

### C. Data & integrations

- [ ] **Remove demo data.** Retire demo recruits (Jordan Sample, Riley Stalled) and the demo
      passcode; import the real DBOA roster.
- [ ] **Confirm Arbiter export access.** Chapter is not the Arbiter admin — securing a scheduled/
      automated export (vs. manual download) is a people/process step that decides whether the daily
      import is hands-off.
- [ ] **Audit every step's completion mode.** Decide which steps are truly self-reportable
      (e.g., "received rulebook") vs. must-be-verified (state test / eligibility). The two Arbiter
      steps were already flipped `self_report → staff_verify`.
- [ ] **Friendlier recruit label for Arbiter steps** ("Complete on ArbiterSports → confirmed
      automatically," no self-mark button).

### D. Infrastructure & email

- [ ] **Stand up a separate production database.** Today staging/simulation shares the prod DB;
      isolate them so test actions can't touch real records.
- [ ] **Verify the Resend sending domain and add DMARC.** First sends landed in spam. Verify the
      sending domain (SPF/DKIM already set) and add the DMARC DNS record Resend provides; consider a
      branded sending domain.

### E. Business / legal (not code)

- [ ] **Related-party structure review.** A nonprofit paying the for-profit (RefNet / Timmons Sport
      Technologies) is a self-dealing/related-party risk. Have an attorney and CPA review before
      money flows. *(Not legal or financial advice — flagging to review with professionals.)*

### F. Polish (post-launch, non-blocking)

- [ ] Surface the board "smart signals" in the frontend (backend already returns `cleared_to_work`,
      time-based `stalled`, `days_idle`, `next_step`, `overdue`).
- [ ] Fees-strip contrast fix on the recruit page.
- [ ] Optional custom domain over `*.netlify.app`.
- [ ] Repo rename `CrewCore → refnet` when convenient.

---

## 5. Incident playbooks

### 5.1 Kiosk shows "TypeError: Failed to fetch"

**Symptom:** the attendance kiosk displays "TypeError: Failed to fetch," often when closing a
session or during polling.

**What it means:** a browser-level network failure — the request never left the device. It is
**not** a server error and **not** a data problem. Confirmed by logs: the kiosk's normal polling
calls return 200, then go silent during a connectivity gap, and the failed action never appears in
the API logs at all.

**Fix (immediate):** check the venue Wi-Fi, **reload the kiosk page**, re-enter the passcode
(`dboa2026`), and retry. The action completes once connectivity is back.

**Prevent:** keep the kiosk device on stable Wi-Fi and awake for the whole session. Planned
hardening: friendly "connection dropped — retry" messaging instead of the raw error, auto-resume
polling on reconnect, a screen wake-lock, and an idempotent `close_session` so a retry is always
safe.

### 5.2 Payment shows as unconfirmed / banner wrong

The success banner can display on `?payment=success` before the webhook processes. Refresh; confirm
the actual `payment`/`step_completion` state in the database or Command Center. Go-live item B makes
the banner read real state.

### 5.3 Recruit can't reach their checklist

They likely lost their `/r/<token>` link. Re-send it. (Post-go-live this becomes a magic-link
re-entry.)

### 5.4 Emails landing in spam

Deliverability issue — verify the Resend sending domain and add DMARC (go-live item D). Until then,
ask recipients to check spam and mark "not spam."

### 5.5 Arbiter record late or missing

A step waiting on the state feed can always be completed by **manual override** in Board Verify.
The feed reconciles idempotently on the next import, so overriding is safe.

### 5.6 General diagnosis

Use the Supabase **API** and **edge-function** logs to see whether a request reached the server and
its status code; run **advisors** for security/RLS and performance findings; check the **Netlify**
deploy log for build issues.

---

## 6. Backups & disaster recovery

- Supabase provides managed automated backups for the project. Confirm the retention/backup policy
  meets the chapter's needs before go-live.
- At go-live, the separate production database (item D) is the system of record; keep migrations in
  version control so the schema is reproducible.

---

## 7. Security posture summary

- Authorization lives in the database (SECURITY DEFINER RPCs + RLS); the anon key is minimally
  privileged.
- All secrets are server-side only and must never appear in the browser or documents.
- The demo-grade items in §4A are the gap between "safe for demo" and "safe for real recruits."
  Close section A before any real official enters real data.

---

*End of Operations & Go-Live Runbook.*
