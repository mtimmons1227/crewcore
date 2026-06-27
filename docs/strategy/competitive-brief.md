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

## Monetization — decision pending

The right model is undecided. Options:

1. **Per-chapter SaaS** — flat monthly/annual fee per chapter. Simple, predictable. Risk: price sensitivity; small chapters may balk.
2. **Per-official seat** — scales with chapter size. Aligns with Arbiter's model (chapters already think in these terms). Risk: discourages growth if officials feel "counted."
3. **Per-recruit outcome** — pay when a recruit becomes an active official. Aligns incentives with chapter outcomes. Risk: hard to attribute; complex billing.
4. **Free for Recruit, paid for Exchange/Payouts** — freemium GTM to get chapters onto the platform, then monetize the higher-value modules. Risk: long path to revenue.

**Recommended starting point:** Per-chapter SaaS at a price that makes the chapter's recruiter feel it's cheaper than losing one game's missed assignment. Revisit when Exchange and Payouts are ready, at which point a bundled chapter-OS price makes sense.

**Decision needed before Slice 3.** See next actions in [SESSION-LOG.md](../SESSION-LOG.md).

---

## Key strategic risks

1. **Arbiter builds recruiting features.** Unlikely short-term; they focus on the assigning core. But possible if a large state association requests it.
2. **Chapter leadership turnover.** Our sponsor at DBOA leaves; successor has no context on CrewCore. Mitigation: strong runbook, self-service onboarding for new chapter admins.
3. **Multi-chapter political friction.** DBOA, NTBOA, and FWBOA are independent and competitive. Positioning as a shared service must not read as "one chapter controls the others." Mitigation: each chapter's data is isolated by RLS; federation is technical, not political.
4. **Supabase free-tier limits.** The live project can pause after inactivity and has storage limits. See [RUNBOOK.md](../RUNBOOK.md) for operational gotchas.

---

*Last updated: 2026-06-27. Owner: Marvin Timmons. Revisit before Slice 3 planning.*
