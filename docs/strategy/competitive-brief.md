# CrewCore — Competitive Brief

**Purpose:** Ground the product strategy in the real competitive landscape before committing to roadmap decisions (pricing, GTM, feature prioritization).

---

## The market we're entering

Dallas-area high school basketball has three major officiating chapters — DBOA, NTBOA, FWBOA — each with 80–200+ active officials and a persistent recruiting problem. Every chapter faces the same pressure: aging membership, high early-dropout rates among new recruits, and school-game demand that outpaces supply. The recruiting and onboarding process is almost entirely manual across all three chapters.

**The real incumbent is the status quo:**
- Recruiting happens through word-of-mouth, Facebook groups, and handshakes at chapter meetings.
- Prospect tracking lives in spreadsheets (usually one person's Google Sheet) or, more often, nowhere.
- Onboarding steps (background checks, FWAA membership, assessment tests, evaluations, clinic attendance) are communicated by email or text and tracked informally.
- Drop-off is invisible until someone misses the game-day roster.

No existing software product owns this problem.

---

## Named competitors

### ArbiterSports (now part of Hudl / BSN Sports)
**What it does:** Game assignment scheduling — the dominant platform for assigning officials to games. Chapters pay per-official annual licenses.

**Where it stops:**
- Zero recruiting features. ArbiterSports assumes officials already exist and are already members.
- No onboarding workflow, no prospect pipeline, no lead capture.
- High switching cost once in (school schedules, payment history, assignments all live there).
- Not designed for chapter management — it's assigner-to-official, not chapter-to-recruit.

**Threat level:** Low for Recruit. High if Hudl ever acquires or builds upmarket into chapter management.

**Opportunity:** Chapters that already run ArbiterSports for assignment are open to adding a separate tool for recruiting — they're already using multiple products.

---

### AssignIt
**What it does:** Lighter game assigning platform, alternative to Arbiter for smaller chapters or those who find Arbiter too expensive.

**Where it stops:** Same recruiting/onboarding blind spot as Arbiter.

**Threat level:** Low.

---

### GameOfficials.net
**What it does:** Web platform combining game management, forum/community features, and some member tracking. More feature-rich than Arbiter for the social/community layer.

**Where it stops:** Not chapter-specific; recruiting and onboarding are not workflow features.

**Threat level:** Low for Recruit. Moderate if they invest in a structured onboarding flow.

---

### Ref60
**What it does:** Simple assigning tool targeting smaller or independent groups.

**Where it stops:** No recruiting, no onboarding, no AI.

**Threat level:** Low.

---

### Homegrown chapter systems
**What it looks like:** A chapter admin with technical skills builds a form, a tracker in Airtable or Notion, or a custom spreadsheet. FWBOA has experimented with this.

**Why it loses:** Single point of failure (the one person who built it), no continuity across leadership transitions, not extensible across chapters.

**Threat level:** Medium — the risk is "we'll just build our own" when a chapter admin has a developer contact. Counter: CrewCore is maintained, improving, and multi-chapter.

---

## CrewCore's competitive position

| | Arbiter / Assign | GameOfficials | Manual | **CrewCore Recruit** |
|---|---|---|---|---|
| Game assigning | ✅ | ✅ | ❌ | ❌ (not Slice 1–2) |
| Prospect capture | ❌ | ❌ | ❌ | ✅ |
| Onboarding workflow | ❌ | ❌ | ❌ | ✅ |
| Chapter branding | ❌ | ❌ | — | ✅ |
| AI lead scoring | ❌ | ❌ | ❌ | Planned (Slice 4) |
| Chapter sovereignty | ❌ (centralized) | ❌ | ✅ | ✅ (federated) |
| Modern UX | ❌ | ❌ | — | ✅ |
| Multi-chapter / federated | ❌ | ❌ | — | ✅ |

**Core positioning:** CrewCore is the only recruiting and onboarding product built specifically for officiating chapters — chapter-controlled, not chapter-replacing. Arbiter owns assignment; we own the top of the funnel. Long-term, we become the chapter operating system that works alongside Arbiter (not against it), eventually reducing their switching cost for chapters that want to consolidate.

---

## Monetization — DECIDED (pending board validation)

**Decision date:** 2026-06-27. Updated 2026-06-27. Pending board validation before external commitment.

### CrewCore software (standalone)
- **$5 per official per year** — flat base, all officials on the roster
- **$4 founding/test rate** — DBOA only, locked in at launch
- **+ 10% success fee, first year only** — applies to any official in their first year with the chapter (new *or* transfer), on the dues they actually pay; converts to the $5 base in year two
- **Calendar-year cutoff: December 31** — roster count and first-year determination both use a Dec-31 snapshot

**Billing:** Annual invoice off the Dec-31 roster. The 10% applies per first-year official (new or transfer) on that year's invoice, based on dues actually paid. Subsequent years those officials fold into the $5 base count.

**Enforcement:** Invoice-based until Slice 3 (Stripe dues) puts CrewCore in the payment path, at which point the 10% becomes automatically attributable and collectible.

### Base-fee rationale
The per-official base is a whole-roster, year-round platform fee — CrewCore walks every official (new and veteran) through onboarding and clearance each season, and it is each new official's first experience with the chapter. This justifies charging per official across the full roster, not just new recruits. Pricing is at parity with RefTown (~$5/official to schedule); the distinction is that RefTown is a cost center and CrewCore is a profit center.

### Real DBOA dues (2026–27)
Officials register in RefTown as part of onboarding. Dues are nonrefundable: New $125 · Returning $175 (eff. Apr 1) · Returning-from-inactive $175 · Transfer $175.

### DBOA estimate
~300 officials × $4 base = $1,200 / year. Example success fee: 60 new officials × $125 × 10% = $750. Heavy year ~$1,950; steady state ~$1,200.

### CrowdIQ / managed recruiting (separate)
CrowdIQ is a **separate premium service**, not bundled with the $5 base:
- Priced on ad spend + management fee + margin
- Per-engagement, not per official
- Pricing framework only — not finalized

**Claims ledger status:** Monetization model — decided ($5 base / $4 DBOA + 10% first-year dues, new + transfer), pending board validation; CrowdIQ pricing — framework only. See the full claims ledger in [`docs/sdlc/08-future-releases.md`](../sdlc/08-future-releases.md).

---

## Key strategic risks

1. **Arbiter builds recruiting features.** Unlikely short-term; they focus on the assigning core. But possible if a large state association requests it.
2. **Chapter leadership turnover.** Our sponsor at DBOA leaves; successor has no context on CrewCore. Mitigation: strong runbook, self-service onboarding for new chapter admins.
3. **Multi-chapter political friction.** DBOA, NTBOA, and FWBOA are independent and competitive. Positioning as a shared service must not read as "one chapter controls the others." Mitigation: each chapter's data is isolated by RLS; federation is technical, not political.
4. **Supabase free-tier limits.** The live project can pause after inactivity and has storage limits. See [RUNBOOK.md](../RUNBOOK.md) for operational gotchas.

---

*Last updated: 2026-06-27. Owner: Marvin Timmons. Revisit before Slice 3 planning.*
