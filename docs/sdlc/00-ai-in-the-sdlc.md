# AI in the SDLC — Framework & How We Applied It
**The conceptual model behind these docs, and where CrewCore sits on it.**

This document frames *how* AI was used across the project. It presents the 8-phase SDLC standard used across all of these repos, AI's role in each phase, the AI-maturity ladder, and a crosswalk to the phase docs. The phase docs (`01`–`08`) carry the concrete record; this one carries the framework.

## The 8-phase SDLC (our standard)
1. **Planning** — identifying the scope and purpose of the software.
2. **Analysis** — gathering requirements and analyzing them.
3. **Design** — creating the architecture and design.
4. **Implementation** — writing and integrating the code.
5. **Testing** — verifying the software meets requirements and is defect-free.
6. **Deployment** — releasing the software to users.
7. **Maintenance** — ongoing support and updates.
8. **Future Releases** — planned work not yet built (roadmap / honesty ledger).

> **Note on labels.** "Implementation" means writing and integrating the code (Phase 4). "Deployment" means releasing to users (Phase 6). Applied identically across every repo.

## AI's role in each phase (general model)
| Phase | How AI contributes |
|---|---|
| Planning | Framing the problem, scope, and risks. |
| Analysis | Structuring requirements and the data model. |
| Design | Generating architecture/patterns; data-flow design. |
| Implementation | AI-assisted coding (LLM copilots). |
| Testing | Scaffolding checks; reasoning about edge cases. |
| Deployment | Drafting runbooks and promotion steps. |
| Maintenance | Change drafting, monitoring, doc upkeep. |
| Future Releases | Maintaining the roadmap. |

## The AI-maturity ladder
- **AI-Assisted** — AI supports tasks; humans drive and approve.
- **AI-Autonomous** — AI generates whole components under oversight.
- **Agentic** — autonomous multi-step action under guardrails.

## Where CrewCore sits
Built at the **AI-Assisted** level: an LLM copilot generated the migration SQL, the security-definer capture function, the React UI, and the product/architecture docs, while a human owned the chapter-sovereignty strategy and approved every schema/RLS change before it was applied. A core **design principle is "use AI only where it adds practical value"** — so the product's own AI features (lead scoring, drop-off prediction, routing, campaign drafting, readiness summaries) are deliberately **deferred to Slice 4**, after the funnel and Command Center are solid (see [08-future-releases.md](08-future-releases.md)). None are built yet, and they should not be described as shipped.

## Crosswalk — our 8 phases → the docs
| # | Phase | Doc |
|---|---|---|
| 1 | Planning | [01-planning.md](01-planning.md) |
| 2 | Analysis | [02-analysis.md](02-analysis.md) |
| 3 | Design | [03-design.md](03-design.md) |
| 4 | Implementation | [04-implementation.md](04-implementation.md) |
| 5 | Testing | [05-testing.md](05-testing.md) |
| 6 | Deployment | [06-deployment.md](06-deployment.md) |
| 7 | Maintenance | [07-maintenance.md](07-maintenance.md) |
| 8 | Future Releases | [08-future-releases.md](08-future-releases.md) |

Each phase doc closes with an **"AI's role in this phase"** section.
