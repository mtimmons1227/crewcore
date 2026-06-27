# Phase 8 — Future Releases
**Also known as (AI-era): Roadmap & Honesty Ledger**
**Status: 🗺️ Planned (not built)**

## Purpose
Capture what's planned but not yet built — within CrewCore Recruit and across the wider ecosystem — so "planned" is never claimed as "shipped."

## What is built today (for contrast)
**CrewCore Recruit, Slice 1 only:** the core schema with RLS + DBOA seed, and a chapter-branded public lead-capture form submitting via `public.submit_lead`. Everything below is planned.

## Planned — within CrewCore Recruit
1. **Recruiter Command Center** (`/command`) — the next build: authenticated console for recruiters/chapter admins to manage incoming interest.
2. **Slice 2 — Onboarding:** onboarding steps, lead status tracking, recruit magic-link status page.
3. **Slice 3 — Compliance:** compliance rollup, division-rep distribution view.
4. **Slice 4 — AI features (not built):** lead scoring, drop-off prediction — and per the brief, also chapter-routing recommendations, campaign drafting, and readiness summaries. Use AI only where it adds practical value.
5. **Slice 5 — Chapter admin config:** a workflow builder so **NTBOA** and **FWBOA** onboard via configuration, not new code.

## Planned — the wider ecosystem (other modules)
Beyond Recruit, CrewCore is designed as a five-module ecosystem. Not yet built:
- **CrewCore Exchange** — controlled exchange for uncovered games.
- **CrewCore Academy** — training and development support.
- **CrewCore Payouts** — payment workflow visibility.
- **CrewCore Insights** — reporting and insights.

## Documentation debt to clear
- **ADR-001 (shared multi-tenant identity)** currently contains only a placeholder PowerShell command, not the decision text — restore the actual ADR content.
- Some existing architecture/session docs have text-encoding artifacts (e.g. dropped leading letters); worth a cleanup pass.

## Suggested phasing
- **Next:** Command Center → Onboarding (Slices 1→2) to make the funnel end-to-end usable for DBOA.
- **Then:** Compliance + Chapter-config (onboard NTBOA/FWBOA) → AI features once there's enough lead data to train/justify them.
- **Later:** the Exchange / Academy / Payouts / Insights modules.

## AI's role in this phase
**Maturity: AI-Assisted.** AI maintains this roadmap and maps each item to its slice/module; the human decides phasing and whether each AI feature clears the "adds practical value" bar before it's built.

## Key artifacts
- [`../CrewCore-Recruit-Implementation-Plan.md`](../CrewCore-Recruit-Implementation-Plan.md) — the slice roadmap.
- [`../../CLAUDE.md`](../../CLAUDE.md) — ecosystem vision and module list.
- See the [artifact index](../artifacts/README.md).
