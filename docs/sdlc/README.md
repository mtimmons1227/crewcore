# CrewCore — Software Development Lifecycle (SDLC)

_How this product is being built, phase by phase, using the standard 8-phase SDLC. Current focus: the **CrewCore Recruit** module._

CrewCore is the operating system for sports officials — a chapter-controlled, federated officiating ecosystem (Recruit, Exchange, Academy, Payouts, Insights) that preserves chapter sovereignty. The first module in build is **CrewCore Recruit**: a chapter-branded public lead-capture funnel, a structured onboarding workflow, and a recruiter Command Center. Initial market: Dallas-area high school basketball chapters (DBOA, NTBOA, FWBOA).

---

## Start here

**[00-ai-in-the-sdlc.md](00-ai-in-the-sdlc.md)** — the AI-maturity framework and where CrewCore sits on it.

---

## Phase index

| # | Phase | Doc | Status | Scope |
|---|---|---|---|---|
| 1 | Planning | [01-planning.md](01-planning.md) | ✅ Complete | Problem framing, product thesis, governance chain, slice rationale |
| 2 | Analysis | [02-analysis.md](02-analysis.md) | ✅ Complete | Stakeholders, functional reqs, domain rules, 5 edge cases |
| 3 | Design | [03-design.md](03-design.md) | ✅ Complete (Slices 1–2) | 10-table schema, 4 RPCs, tiered clearance, DBOA workflow seed, ADRs 001–016 |
| 4 | Implementation | [04-implementation.md](04-implementation.md) | 🔄 In progress | Slices 1–2 done; Slice 3 (Dues/Stripe) next |
| 5 | Testing | [05-testing.md](05-testing.md) | 🔄 In progress | Manual test matrix defined; no automated suite yet |
| 6 | Deployment | [06-deployment.md](06-deployment.md) | ⏳ Not yet reached | Pre-production; go-live plan documented |
| 7 | Maintenance | [07-maintenance.md](07-maintenance.md) | ⏳ Not yet reached | Anticipated concerns documented; begins at first chapter go-live |
| 8 | Future Releases | [08-future-releases.md](08-future-releases.md) | 🗺️ Planned | Roadmap + pricing model + claims ledger |

---

## Canonical slice roadmap

| Slice | Name | Status | Core deliverables |
|---|---|---|---|
| 1 | Lead Capture + Command Center | ✅ Done | Core schema + RLS, `submit_lead` RPC, chapter-branded lead form, authenticated recruiter Command Center |
| 2 | Registration / Clearance + Timeline + Roster | ✅ Done | `workflow_step` config, `registration_cycle`, `step_completion`, tiered clearance (70/90), magic-link recruit timeline, roster detail panel with step checklist |
| 3 | Dues / Stripe | 🔜 Next | Stripe dues integration; makes the 10% success fee automatically attributable and collectible |
| 4 | AI Features | 🗺️ Planned | Lead scoring, drop-off prediction, shortage-zone targeting, campaign drafting, readiness summaries |
| 5 | Workflow Builder + Lifecycle | 🗺️ Planned | Chapter-admin config UI; NTBOA + FWBOA onboarding via configuration; renewal and lapsed-official lifecycle |
| 6 | Assigner Hand-off | 🗺️ Planned | Cleared-official hand-off signal to ArbiterSports; "Ready" state triggers assigner notification |
| 7 | Renewals | 🗺️ Planned | Annual season rollover, returning-official re-registration, renewal reminders |
| 8 | Mentor / Referral | 🗺️ Planned | Peer mentorship pairing, referral attribution, mentor credit tracking |

---

## Tech stack at a glance

| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript (`apps/web`); Tailwind CSS 3 |
| Design language | EarnedHome — navy (`bg-slate-900`) header, white cards on `bg-slate-100` |
| Backend / data | Supabase (Postgres + Auth + Row-Level Security + Storage) |
| Public surfaces | `/` lead capture, `/r/:token` recruit status page |
| Staff surface | `/command` recruiter + chapter-admin Command Center |
| Schema delivery | Ordered SQL migration files (`supabase/migrations/`) |
| Repo layout | `apps/web`, `services/api`, `packages/shared`, `supabase/migrations`, `docs/` |

---

## Wider ecosystem (beyond Recruit)

| Module | Status |
|---|---|
| CrewCore Recruit | In build — Slices 1–2 complete |
| CrewCore Exchange | Planned — controlled exchange for uncovered games |
| CrewCore Academy | Planned — training and development support |
| CrewCore Payouts | Planned — payment workflow visibility |
| CrewCore Insights | Planned — reporting and analytics |

**Supporting artifacts:** the [artifact index](../artifacts/README.md) maps this narrative to the existing product/architecture/decision docs, the migrations, and all deliverables.
