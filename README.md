# CrewCore

**The operating system for sports officials.** CrewCore is a chapter-controlled officiating
ecosystem that recruits, develops, assigns, supports, and retains officials while preserving each
chapter's autonomy.

> **First market:** Dallas-area high-school basketball chapters — DBOA (first customer), with
> NTBOA and FWBOA next. CrewCore is part of the broader **RefNet** ecosystem (see
> `docs/manuals/CrewCore_Architecture_and_Design_Manual.md`).

---

## What's here

This is a monorepo:

```
apps/web/            React + TypeScript + Vite + Tailwind single-page app (the CrewCore Pathway UI)
supabase/            Postgres schema (migrations/), edge functions (functions/), config
docs/                All product, architecture, SDLC, and operations documentation
marketing/           Standalone marketing SVGs (not imported by the app)
CLAUDE.md / AGENTS.md  Authoritative living context for the repo
```

## Tech stack

- **Frontend:** React 18 · React Router 6 · TypeScript 5 · Vite 5 · Tailwind 3 ·
  `@supabase/supabase-js`
- **Backend:** Supabase — PostgreSQL 15, Row-Level Security, SECURITY DEFINER RPCs, Edge
  Functions (Deno)
- **Payments:** Stripe (test mode today) · **Email:** Resend
- **Hosting:** Netlify — `main` → production (`refnet-dboa.netlify.app`), `staging` → staging

## Quick start (frontend)

```bash
cd apps/web
cp .env.example .env.local     # set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev                    # http://localhost:5173
```

The app requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and will refuse to start
without them. Never commit real `.env*` files (they are gitignored).

## Key routes

| Route | Screen | Audience |
|---|---|---|
| `/` | Lead Capture | Public |
| `/r/:token` | Recruit Pathway timeline | Recruit |
| `/r/:token/make-the-call` | Make the Call (chapter placement) | Recruit |
| `/command` | Command Center | Staff |
| `/board`, `/board/verify` | Board Dashboard / Verify | Board |
| `/sessions/admin`, `/kiosk/:id`, `/checkin/:id` | Attendance | Staff / Recruit |

## Documentation

Start at **[`docs/README.md`](docs/README.md)**. The current manuals live in
[`docs/manuals/`](docs/manuals/):

- **User Manual** — how to use every screen (officials and board).
- **Architecture & Design Manual** — stack, data model, workflow engine, integration design.
- **Operations & Go-Live Runbook** — deploy, config, go-live checklist, incident playbooks.

The phase-by-phase SDLC set is in [`docs/sdlc/`](docs/sdlc/) (see
`CrewCore_SDLC_Documentation_Current.md` for the current compilation).

## Status & go-live

Slices 1–2 and the operational tools (board verify, Make the Call, attendance engine, Arbiter
import) are shipped; Stripe dues automation is next. Before real recruits and real money, work
the go-live checklist in the Operations & Go-Live Runbook (staff auth, remove demo/sim RPCs,
separate production DB, Stripe live keys, DMARC). See `CLAUDE.md` for the authoritative
current-state summary.
