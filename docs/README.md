# CrewCore — Documentation

This folder follows the **standard documentation layout used across all of these projects**:

1. **This README** — what the product is and how the docs are organized.
2. **[`sdlc/`](sdlc/README.md)** — the Software Development Lifecycle, phase by phase.
3. **[`artifacts/`](artifacts/README.md)** — supporting reference documents and deliverables.

CrewCore already keeps detailed working docs under `product/`, `architecture/`, `decisions/`, and `prompts/`. The `sdlc/` folder is the **phase-by-phase narrative** that ties those together; it references them rather than duplicating them.

## What CrewCore is
The operating system for sports officials — a chapter-controlled, federated officiating ecosystem (Recruit, Exchange, Academy, Payouts, Insights) that recruits, develops, assigns, supports, and retains officials while preserving chapter sovereignty. Current build focus: **CrewCore Recruit**.

## How the documentation is organized

### `sdlc/` — the lifecycle
| # | Phase | What it covers |
|---|---|---|
| 1 | [Planning](sdlc/01-planning.md) | Scope and purpose |
| 2 | [Analysis](sdlc/02-analysis.md) | Requirements + feasibility |
| 3 | [Design](sdlc/03-design.md) | Architecture and design |
| 4 | [Implementation](sdlc/04-implementation.md) | Writing and integrating the code |
| 5 | [Testing](sdlc/05-testing.md) | Verifying it meets requirements |
| 6 | [Deployment](sdlc/06-deployment.md) | Releasing to users |
| 7 | [Maintenance](sdlc/07-maintenance.md) | Ongoing support and updates |
| 8 | [Future Releases](sdlc/08-future-releases.md) | Planned, not-yet-built work |

### `artifacts/` — reference docs & deliverables
The [artifact index](artifacts/README.md) maps each SDLC phase to its supporting documents — the product briefs, architecture and data-model docs, the ADR, the migrations, the AI reference/narrative Word docs, and the compiled SDLC Word document.

### Existing working docs this links to
[`product/`](product/) (briefs, blueprint, user flows, demo), [`architecture/`](architecture/) (data model, UI architecture), [`decisions/`](decisions/) (ADRs), [`prompts/`](prompts/), [`CrewCore-Recruit-Implementation-Plan.md`](CrewCore-Recruit-Implementation-Plan.md), [`CrewCore-Recruit-SESSION-LOG.md`](CrewCore-Recruit-SESSION-LOG.md), [`RUNBOOK.md`](RUNBOOK.md), and [`../CLAUDE.md`](../CLAUDE.md).

## The standard, in one line
**Markdown is the source of truth; Word is the polished output generated from it.**
