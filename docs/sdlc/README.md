# CrewCore — Software Development Lifecycle (SDLC)

_How this product is being built, phase by phase, using the standard 8-phase SDLC. Current focus: the **CrewCore Recruit** module._

CrewCore is the operating system for sports officials — a chapter-controlled, federated officiating ecosystem (Recruit, Exchange, Academy, Payouts, Insights) that preserves chapter sovereignty. The first module in build is **CrewCore Recruit**: a chapter-branded public lead-capture funnel plus a recruiter Command Center. Initial market: Dallas-area high school basketball chapters (DBOA, NTBOA, FWBOA).

## Start here
**[00-ai-in-the-sdlc.md](00-ai-in-the-sdlc.md)** — the framework and where CrewCore sits.

## The phases (CrewCore Recruit)
| # | Phase | Doc | Status |
|---|---|---|---|
| 1 | Planning | [01-planning.md](01-planning.md) | ✅ Complete |
| 2 | Analysis | [02-analysis.md](02-analysis.md) | ✅ Complete |
| 3 | Design | [03-design.md](03-design.md) | ✅ Complete (Slice 1) |
| 4 | Implementation | [04-implementation.md](04-implementation.md) | 🔄 In progress (Slice 1 done; Command Center next) |
| 5 | Testing | [05-testing.md](05-testing.md) | ⏳ Not yet formalized |
| 6 | Deployment | [06-deployment.md](06-deployment.md) | 🔄 In progress (Supabase live; static Vite app) |
| 7 | Maintenance | [07-maintenance.md](07-maintenance.md) | ⏳ Not yet reached |
| 8 | Future Releases | [08-future-releases.md](08-future-releases.md) | 🗺️ Planned |

**Where it stands:** Slice 1 (Capture) is done — core schema + RLS + DBOA seed and a working public lead-capture form. Next is the Recruiter Command Center, then Onboarding, Compliance, AI features, and chapter-config. The other four ecosystem modules are future work.

**Supporting artifacts:** the [artifact index](../artifacts/README.md) maps this narrative to the existing product/architecture/decision docs, the migrations, and the AI reference Word docs.

## Tech stack at a glance
- **Frontend:** Vite + React + TypeScript (`apps/web`).
- **Backend / data:** Supabase Postgres + Auth + Row-Level Security.
- **Layout:** `apps/web`, `services/api`, `packages/shared`, `supabase/migrations`.
- **Deployment:** static-hosted public app on `/`, recruiter console on `/command`.
