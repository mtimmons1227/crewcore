# Phase 8 — Future Releases
**Also known as (AI-era): Roadmap & Honesty Ledger**
**Status: 🗺️ Planned (not built)**

## Purpose
Capture what's planned but not yet built — within CrewCore Recruit and across the wider ecosystem — so "planned" is never claimed as "shipped."

## What is built today (for contrast)
**CrewCore Recruit, Slices 1 & 2 (as of 2026-06-28):** full schema with RLS; DBOA 11-step workflow with full prerequisite graph and deadline policy; public lead-capture form (`/`); recruit magic-link timeline (`/r/:token`) with authority colors, due-date chips, and stalled indicator; staff Command Center (`/command`) with recruit roster, detail panel, due-date-based stalled detection, and rose Stalled badge. Everything below is planned or scoped-not-built.

## Planned — within CrewCore Recruit
1. ✅ **Recruiter Command Center** (`/command`) — shipped in Slice 1.
2. ✅ **Slice 2 — Registration / clearance / timeline** — shipped: recruit magic-link page, tiered clearance engine, Command Center roster with detail panel.
3. **Slice 3 — Stripe auto-payment (scoped, not built):** recruit pays chapter dues on their `/r/:token` page via Stripe Checkout → Stripe webhook fires → Supabase Edge Function validates and marks the chapter-dues `step_completion` row complete (replacing manual staff verification). This puts CrewCore in the payment path, makes the 10% success fee auto-enforceable, and is the recurring-revenue rail. Gated on board demo reaction. Implementation will require a `payment` or `dues_record` table and an Edge Function (ADR-019+).
4. **Slice 4 — AI features:** lead scoring, drop-off prediction, chapter-routing recommendations, campaign drafting, readiness summaries. Begin after Slice 3; use AI only where it adds practical value.
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
- **$5 per official per year** — flat base, all officials on the roster
- **$4 founding/test rate** — DBOA only, locked in at launch
- **+ 10% success fee, first year only** — applies to any official in their first year with the chapter (new *or* transfer), on the dues they actually pay; they convert to the $5 base in year two and beyond
- **Calendar-year cutoff: December 31** — both the annual roster count and first-year determination use a Dec-31 snapshot; officials joining after Dec 31 roll into the following year

### Base-fee rationale
The per-official base is a whole-roster, year-round platform fee. CrewCore walks every official — new and veteran — through onboarding and clearance each season, and it is each new official's first experience with the chapter. This justifies charging per official across the full roster, not just new recruits. Pricing is at parity with RefTown (~$5/official to schedule); the difference is that RefTown is a cost center, CrewCore is a profit center.

### Real DBOA dues (2026–27 registration)
Officials register in RefTown as part of onboarding. Dues are nonrefundable.

| Member type | Dues |
|---|---|
| New | $125 |
| Returning (effective Apr 1) | $175 |
| Returning-from-inactive | $175 |
| Transfer | $175 |

### DBOA estimate
- **Base:** ~300 officials × $4 = **$1,200 / year**
- **Success fee example:** 60 new officials × $125 × 10% = **$750**
- **Heavy recruiting year:** ~$1,950 total
- **Steady state (few new recruits):** ~$1,200

### Billing mechanics
Annual invoice issued off the Dec-31 roster snapshot. The 10% success fee applies per first-year official (new or transfer) on that year's invoice, calculated against the dues they actually paid. Subsequent years those officials appear only in the $5 base count.

### Enforcement path
The 10% is invoice-based until **Slice 3 (Stripe dues integration)** puts CrewCore in the payment path — at which point it becomes automatically attributable and collectible.

### CrowdIQ / managed recruiting
CrowdIQ (AI-managed recruiting campaigns) is a **separate premium service**, not bundled with the software price:
- Structure: ad spend + management fee + margin
- Priced per engagement, not per official
- Pricing framework only — not finalized

---

## Claims ledger

Tracks what we have claimed so others can verify the current state without guessing.

| Claim | Status | Notes |
|---|---|---|
| Monetization model | **Decided** (pending board validation) | CrewCore standalone: $5/official/yr ($4 DBOA) + 10% first-year dues (new + transfer) |
| CrowdIQ pricing | Framework only | Ad spend + management + margin; not finalized |
| Command Center (Slice 1) | Shipped | Verified end-to-end |
| Registration / clearance / recruit timeline (Slice 2) | Shipped | Committed and pushed to main |
| RecruitMenuPage full restyle | Shipped | Navy theme, step-type icons, authority colors, due dates, stalled badge |
| Due-date stalled status (Command Center + recruit page) | Shipped | Rose Stalled badge; replaces 14-day inactivity heuristic |
| DBOA 11-step workflow | In DB (catch-up migration pending) | 3 new steps + reorder + prereq graph applied directly; migration file to capture state is pending |
| `get_registration` migration (expose `due_at`) | Committed, not pushed | Run `npx supabase db push --project-ref nfcmesyfijtnrsdhypqn` to activate |
| Demo recruits (Jordan Sample, Riley Stalled) | In live DB | Remove after board demo |
| Stripe auto-payment (Slice 3) | Scoped | Checkout → webhook → Edge Function → auto-complete dues; not yet built |
| AI features (Slice 4) | Planned | Not started |
| Chapter admin config (Slice 5) | Planned | Not started |
| Exchange / Academy / Payouts / Insights | Planned | Not started |

---

## Pending catch-up work (as of 2026-06-28)

- **Push `get_registration` migration**: `20260628000000_expose_due_at_in_get_registration.sql` is committed to the repo but not yet applied to the live DB. Run `npx supabase db push --project-ref nfcmesyfijtnrsdhypqn`. Until this runs, `due_at` is `null` on all RPC step responses and no per-step due-date chips appear (safe no-op fallback).
- **Workflow expansion migration**: the DBOA workflow was expanded to 11 steps via direct DB change (3 new steps + reorder + prereq graph). No migration file captures this yet — either author one from the live DB state or confirm it landed in an existing migration. Verify: `SELECT name, sort_order, step_type, cadence, required, authority, prerequisite_step_id FROM workflow_step ORDER BY sort_order`.
- **Demo recruit cleanup**: remove "Jordan Sample (demo)" and "Riley Stalled (demo)" from the live DB after the board demo.

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
