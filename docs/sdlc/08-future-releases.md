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

## Pricing model — DECIDED (pending board validation)

**Status:** Decision made by product team. Pending board validation before external commitment. Do not publish externally until board sign-off.

### CrewCore software pricing (standalone)
- **$4 per official per year** — flat base, all officials
- **$3 founding-chapter rate** — DBOA only, locked in at launch
- **+ 10% of new-official dues, first year only** — applies to each new official in the calendar year they join; converts to the $4 flat base in year two and beyond
- **Calendar-year cutoff: December 31** — both the annual roster count and "new recruit" determination use a Dec-31 snapshot; recruits captured after Dec 31 count toward the following year

### Billing mechanics
Annual invoice issued off the Dec-31 roster snapshot. The 10% applies per new official on that year's invoice (their first year as an official). Subsequent years those officials appear only in the $4 base count.

### Enforcement path
The 10% is invoice-based until **Slice 3 (Stripe dues integration)** puts CrewCore in the payment path — at which point it becomes automatically attributable and collectible.

### CrowdIQ / managed recruiting
CrowdIQ (AI-managed recruiting campaigns) is a **separate premium service**, not bundled with the software price:
- Structure: ad spend + management fee + margin
- Priced per engagement, not per official
- Pricing framework only — not finalized

### Value framing (for the record)
RefTown costs ~$5/official to schedule (a pure cost center). CrewCore is a profit center: an average new official generates ~$150 in first-year dues, making $4 + 10%-year-one value-justified at the chapter level even before Exchange/Payouts revenue.

---

## Claims ledger

Tracks what we have claimed so others can verify the current state without guessing.

| Claim | Status | Notes |
|---|---|---|
| Monetization model | **Decided** (pending board validation) | CrewCore standalone: $4/official/yr + 10% new-official dues year-one; $3 founding rate for DBOA |
| CrowdIQ pricing | Framework only | Ad spend + management + margin; not finalized |
| Command Center (Slice 1) | Shipped | Verified end-to-end |
| Detail panel / restyle (Slice 2) | Shipped | Committed and pushed to main |
| Compliance rollup (Slice 3) | Planned | Next build target |
| AI features (Slice 4) | Planned | Not started |
| Chapter admin config (Slice 5) | Planned | Not started |
| Exchange / Academy / Payouts / Insights | Planned | Not started |

---

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
