# CrewCore — Documentation

This folder follows the **standard documentation layout used across these projects**. Start here.

## Current manuals (read these first)

The authoritative, current documentation set lives in **[`manuals/`](manuals/)**:

| Document | What it covers |
|---|---|
| [User Manual](manuals/CrewCore_User_Manual.md) | Every screen, both audiences (officials/recruits and board/admins) |
| [Architecture & Design Manual](manuals/CrewCore_Architecture_and_Design_Manual.md) | Stack, backend, data model, workflow engine, integration design |
| [Operations & Go-Live Runbook](manuals/CrewCore_Operations_and_GoLive_Runbook.md) | Deploy, config/secrets, go-live checklist, incident playbooks |

Word + PDF versions of each are generated for sharing (kept in OneDrive `AI Project\RefNet`).
**Markdown here is the source of truth; Word is the polished output generated from it.**

## The lifecycle — [`sdlc/`](sdlc/README.md)

The phase-by-phase Software Development Lifecycle. The current compilation is
[`sdlc/CrewCore_SDLC_Documentation_Current.md`](sdlc/CrewCore_SDLC_Documentation_Current.md)
(reflects the latest build); the numbered `01`–`08` files are the detailed phase narratives.

| # | Phase | # | Phase |
|---|---|---|---|
| 1 | [Planning](sdlc/01-planning.md) | 5 | [Testing](sdlc/05-testing.md) |
| 2 | [Analysis](sdlc/02-analysis.md) | 6 | [Deployment](sdlc/06-deployment.md) |
| 3 | [Design](sdlc/03-design.md) | 7 | [Maintenance](sdlc/07-maintenance.md) |
| 4 | [Implementation](sdlc/04-implementation.md) | 8 | [Future Releases](sdlc/08-future-releases.md) |

## Working docs

- [`product/`](product/) — briefs, blueprint, user flows, demo, slice scope docs (`product/testing/` holds test plans)
- [`architecture/`](architecture/) — data-model and UI-architecture working notes
- [`decisions/`](decisions/) — Architecture Decision Records (ADRs)
- [`prompts/`](prompts/) — Claude Code build prompts
- [`artifacts/`](artifacts/README.md) — the compiled SDLC Word doc + artifact index
- [`archive/`](archive/) — superseded/legacy material (incl. `legacy-migrations/`)
- [`../CLAUDE.md`](../CLAUDE.md) — authoritative current-state summary of the repo

## What CrewCore is

The operating system for sports officials — a chapter-controlled, federated officiating ecosystem
that recruits, develops, assigns, supports, and retains officials while preserving chapter
sovereignty. **Current front end:** the CrewCore Pathway recruit/onboarding experience.
