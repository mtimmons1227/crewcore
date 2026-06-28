# Phase 6 — Deployment
**Also known as (AI-era): Deployment & Operations**
**Status: ⏳ Not yet reached** — the Supabase backend is live (it is the production DB), but the frontend is local-only (Vite dev server). No public hosting target has been configured yet.

---

## Purpose

Ship the system to where real users can reach it — and run it reliably. For CrewCore Recruit, this means a publicly accessible lead capture form, a recruit-facing status URL, and a staff Command Center that works from anywhere — all backed by the live Supabase project that is already in production for the backend.

---

## Process (repeatable)

1. Choose a frontend hosting target.
2. Configure environment variables at the host.
3. Set up a build pipeline (manual or CI).
4. Apply the pre-launch hardening checklist to both the frontend host and the Supabase project.
5. Do a smoke-test of the full end-to-end flow from a clean browser session.
6. Document the release steps in the runbook.
7. Monitor for errors in the first 24–48 hours.

---

## Current state (local only)

**Backend (live):** Supabase project `fcmesyfijtnrsdhypqn` is the production database. All schema, RLS, RPCs, triggers, and seed data are applied and live. This is not a test environment — it holds real recruits.

**Frontend (local dev server only):** `cd apps/web && npm run dev` starts the Vite dev server at `http://localhost:5173` (or 5174 if 5173 is in use). The public lead capture form, the recruit status page, and the Command Center all work locally against the live Supabase backend.

**Not yet done:**
- No publicly hosted frontend.
- No CI/CD pipeline.
- No custom domain.
- Pre-launch hardening checklist partially applied (see below).

---

## Go-live plan

### Step 1 — Choose a frontend host

Recommended: **Vercel** or **Netlify** (both support static Vite builds with SPA routing out of the box).

Requirements:
- Serve `apps/web/dist/` as a static site.
- Support SPA fallback routing so `/command` and `/r/:token` work without a 404 on direct URL access.
- Support environment variable injection at build time (for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).

### Step 2 — Environment and secret handling

**What goes in environment variables (at the host):**
- `VITE_SUPABASE_URL` — the Supabase project REST URL (e.g. `https://fcmesyfijtnrsdhypqn.supabase.co`).
- `VITE_SUPABASE_ANON_KEY` — the Supabase anon/publishable key.

**Why the anon key is safe in the browser:** The anon key is a publishable key — it identifies the project, not a user. Access to data is determined entirely by RLS policies. The anon key alone cannot read `person`, `lead`, or any protected table. The only write path it enables is through the `submit_lead` security-definer function, which is intentional.

**What never goes in the browser:**
- The `service_role` key. This key bypasses RLS entirely. It must never appear in the frontend or in `VITE_*` variables. Keep it only in server-side contexts (e.g., a future `services/api` layer) or in the Supabase dashboard.

**Local `.env`:** `apps/web/.env` (from `.env.example`). This file is in `.gitignore` and must never be committed.

### Step 3 — Build pipeline

Manual promotion (current plan for go-live):
```
cd apps/web
npm install
npm run build          # produces apps/web/dist/
# Upload dist/ to host or trigger host deploy hook
```

CI/CD (add in Slice 3 or when the team grows):
- GitHub Actions or Vercel/Netlify automatic deploy on push to `main`.
- Run `npm run build` on every PR to catch build errors before they reach prod.

### Step 4 — Pre-launch hardening checklist

**Supabase Auth settings (dashboard → Authentication → Settings):**
- [ ] Enable "Confirm email" (currently disabled for dev convenience — re-enable before any external staff onboards).
- [ ] Enable leaked-password protection (HaveIBeenPwned check).
- [ ] Disable open sign-up and switch to invite-only (so only known staff accounts can register; prevents unwanted account creation that then sees zero data but looks messy).
- [ ] Set a rate limit on the `submit_lead` function call (Supabase Edge Function rate limiting or upstream CDN) to prevent form spam.

**Supabase project (dashboard → Settings → General):**
- [ ] Move off the free tier to prevent project auto-pause. The free tier pauses after ~1 week of inactivity; a paused project returns 503 errors that look like auth errors. Upgrade to Pro or set up a keep-alive query if staying on free.
- [ ] Enable Point-in-Time Recovery (PITR) for backups.
- [ ] Review `get_advisors` output and resolve any open security findings.
- [ ] Add a custom domain for the Supabase project (optional but cleaner for recruits seeing network requests).

**Frontend host:**
- [ ] Configure SPA fallback (`/index.html` for all unmatched routes) so direct-URL access to `/command` and `/r/:token` works.
- [ ] Add a custom domain (e.g. `recruit.dboa.org` or a CrewCore subdomain).
- [ ] Configure HTTPS (automatic on Vercel/Netlify).

**Content and UX:**
- [ ] Replace `[your email]` placeholder in board materials before distributing.
- [ ] Confirm DBOA chapter branding (logo, tagline, hero text) looks correct on the live deployed form, not just localhost.
- [ ] Test the magic-link flow from a real mobile device (recruits may be on phones).

### Step 5 — Release steps

1. Apply any pending migrations to the live DB via the Supabase dashboard SQL editor. Verify with `select count(*) from workflow_step` that the expected rows are present.
2. Build the frontend: `npm run build` in `apps/web/`.
3. Deploy `dist/` to the chosen host. Confirm the deploy succeeded (host dashboard).
4. From a fresh incognito browser session, test the full lead capture flow: visit the form URL → submit a test lead → confirm in Supabase dashboard that the `person` and `lead` rows were created.
5. Test the Command Center: visit `/command` → log in → confirm leads appear → open the detail panel for one recruit.
6. Test a magic-link flow: visit `/r/:token` with a valid token → confirm the status page loads and a step can be self-reported.
7. If all three flows pass, announce the URL to DBOA staff and confirm.

### Step 6 — Post-launch monitoring (first 48 hours)

- Check Supabase logs for unexpected errors (dashboard → Logs → API).
- Check for 400 responses from the `submit_lead` RPC (would indicate a DB issue).
- Confirm new recruits are appearing in the Command Center as expected.
- Ask DBOA staff to confirm the Command Center is working from their machines.

---

## AI's role in this phase

**Maturity: AI-Assisted.** AI drafted this deployment plan, the pre-launch checklist, and the runbook. Applying migrations to the live DB, setting host environment variables, and clicking the "re-enable confirm email" switch in the Supabase dashboard are human actions. AI cannot perform those steps directly.

---

## Key artifacts

- `apps/web/.env.example` — required environment variables for the frontend.
- `apps/web/dist/` — production build output (generated by `npm run build`).
- [`../RUNBOOK.md`](../RUNBOOK.md) — local dev setup, staff onboarding SQL, hardening checklist.
- `supabase/migrations/*` — the migration files to apply in order.
- See the [artifact index](../artifacts/README.md).

---

**Status: ⏳ Not yet reached.** Backend is live (production Supabase project). Frontend is local dev only. Go-live is planned after DBOA board validation of the pricing model (the highest-priority open item). Pre-launch checklist is defined above; none of it is blocking the board presentation.
