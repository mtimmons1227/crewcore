# CrewCore Recruit

CrewCore Recruit is the first module of the CrewCore officiating ecosystem. It captures and converts new official recruits through a chapter-specific public lead capture funnel, then gives authorized staff a secure Command Center to manage incoming interest.

## Stack

- Frontend: Vite + React + TypeScript
- Backend / data: Supabase Postgres + Auth + Row-Level Security
- Deployment: public lead capture on `/`, staff console on `/command`

## Repo layout

- `apps/web` — React web app for the public Lead Capture page and the authenticated Command Center.
- `docs` — architecture, implementation plan, session log, runbook, and product docs.
- `supabase/migrations` — SQL migration files applied to the Supabase project.

## Routes

- `/` — public Lead Capture page for prospects.
- `/command` — staff Command Center for authenticated recruiters and chapter admins.
