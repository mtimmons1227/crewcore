# Phase 6 — Deployment
**Also known as (AI-era): Deployment & Operations**
**Status: 🔄 In progress** — the Supabase backend is live and the public app is a static-hosted Vite build; a formal hosting/promotion runbook for production is still to be finalized.

## Purpose
Ship the system to where users reach it and run it reliably.

## Process (repeatable)
1. Apply migrations to the Supabase project.
2. Build and host the static Vite app.
3. Configure environment per host.
4. Promote per slice; keep a runbook.

## What we did / plan on CrewCore Recruit

### Backend
- **Supabase project** is live (Recruit core schema, RLS, and DBOA seed applied). Migrations are the deployment unit — applied in order from `supabase/migrations/`.

### Frontend
- The public app is a **static-hosted Vite app** in `apps/web` (a `dist/` build is produced). It initializes Supabase via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Routes: `/` (public Lead Capture) and `/command` (Command Center).

### Environment configuration
- `apps/web/.env` (from `.env.example`) holds the Supabase URL and anon key. Secrets stay out of the repo; the anon key is safe for the browser because RLS and the security-definer RPC enforce access.

### To finalize for production
- A documented hosting target + CI/CD for `apps/web` (e.g. static host building from the repo).
- A promotion runbook covering migration apply order and a post-deploy smoke check of the capture flow. The general operational steps live in [`../RUNBOOK.md`](../RUNBOOK.md).

## AI's role in this phase
**Maturity: AI-Assisted.** AI drafts the migration/promotion steps and the runbook. Applying migrations to the live Supabase project and setting host configuration stay with the human.

## Key artifacts
- `supabase/migrations/*`, `apps/web/dist/`, `apps/web/.env.example`.
- [`../RUNBOOK.md`](../RUNBOOK.md).
- See the [artifact index](../artifacts/README.md).
