# Phase 1 — Planning
**Also known as (AI-era): Problem Framing & Scope Definition**
**Status: ✅ Complete**

---

## Purpose

Identify the scope and purpose of the software before any code is written: what we're building, why, who it's for, what's in scope, and what the constraints are. A good planning phase prevents building the wrong thing — and in a politically sensitive market like officiating chapter management, it also prevents building in a way that gets the product rejected before it launches.

---

## Process (repeatable)

1. Frame the problem from the user's lived experience, not from a feature list.
2. Name the primary users and their relationship to one another.
3. State the mission and the non-negotiable design principles.
4. Set the scope — what's in, and explicitly what's out.
5. Map the constraints: market, political, operational, and financial.
6. Break delivery into vertical slices in priority order, with rationale for the ordering.

---

## What we did on CrewCore

### The problem

Sports officials chapters face a compounding set of problems that no existing software addresses:

**Recruiting is informal and invisible.** Recruiting happens through word-of-mouth, Facebook group posts, and handshakes at chapter meetings. There is no digital front door, no tracking system, and no pipeline visibility. A chapter cannot run a targeted campaign or measure what's working.

**Onboarding is manual and leaky.** New officials are told what to do by text or email. Required steps — background check, rules exam, dues payment, clinic attendance, evaluation — are tracked in spreadsheets or not tracked at all. Drop-off is invisible until someone is missing from the game-day roster.

**DBOA's reality at the start of this project:** prospect interest was captured via a Google Form. Dues were paid by mailed check to the chapter treasurer. Onboarding status lived in one person's head. If that person left the chapter, so did the institutional knowledge.

**The tools that exist serve the wrong problem.** ArbiterSports / Arbiter assigns officials to games. It has no recruiting features, no onboarding workflow, and no prospect pipeline — it assumes officials already exist and are already members. GameOfficials.net adds community features but not structure. No product owns the top of the funnel.

The real incumbent is the status quo: nobody is solving this problem with software, for this market, at any price.

### Product thesis

**CrewCore is the operating system for sports officials.** Its first job — and the proof point that unlocks everything else — is to be the **recruiting front door** for officiating chapters.

This is not an assigner replacement. Chapters that already use ArbiterSports keep it. CrewCore runs alongside it, owning the funnel from first awareness to assignment-ready. Once that front door is proven, the ecosystem expands: exchange, academy, payouts, insights. But the proof point is the funnel.

The thesis requires solving two problems simultaneously:

1. **The prospect experience.** A person interested in officiating should be able to find a chapter, submit interest digitally, and know what to do next at every step — without chasing anyone for information.
2. **The recruiter experience.** A chapter recruiter working 30 prospects at peak season should see who needs attention without a spreadsheet and without manually updating status for every recruit.

The platform is deliberately **chapter-controlled, not chapter-replacing.** Chapters keep their leadership, dues structure, bylaws, training culture, evaluation standards, playoff eligibility rules, and school relationships. CrewCore provides shared infrastructure; chapters own everything else.

### First market: DBOA

**Governance chain:** NFHS (National Federation of State High School Associations) → UIL (University Interscholastic League, the Texas governing body for high school athletics) → THSBOA (Texas High School Basketball Officials Association, the state body that registers and certifies officials) → DBOA (Dallas Basketball Officials Association, the local chapter).

DBOA officiates Dallas-area UIL high school basketball under THSBOA rules. Officials must satisfy both state requirements (THSBOA registration, NFHS rules exam via ArbiterSports org 6577) and chapter requirements (DBOA dues, orientation, evaluation). Both layers are tracked in CrewCore's workflow. Chapter authority governs local requirements; state authority governs state requirements. Neither can waive the other.

DBOA is the beachhead for three reasons:
1. The product owner has direct access to DBOA leadership — low friction to validate real workflow requirements and get feedback without a sales cycle.
2. DBOA is representative of the target market: 250–350 active officials, manual current state, consistent recruiting pressure, basketball focus, and a leadership team willing to adopt new tools.
3. The data model is multi-tenant from day one — proving with DBOA means NTBOA and FWBOA onboard via configuration, not code rewrites.

### Design principles (non-negotiable)

1. **Preserve chapter sovereignty.** Chapters are not customers of a SaaS that dictates how they operate. They are the operating unit; CrewCore is their infrastructure.
2. **Simple workflows with innovative outcomes.** The recruiter's day should get simpler, not more complicated, because of this software. Complexity is a product failure.
3. **Use AI only where it adds practical value.** AI features (lead scoring, drop-off prediction, etc.) are deferred until the funnel and Command Center are solid. An AI feature that runs on 12 leads is noise. On 300 leads it becomes signal.
4. **Design for chapters and assigners first.** The assigner is the downstream customer of the recruiting funnel. If the funnel doesn't hand off assignment-ready officials, it hasn't done its job.
5. **Start as an overlay ecosystem, not a forced replacement.** Never require a chapter to abandon ArbiterSports, their Google Sheets, or their existing email processes. Add structure around what they already have.
6. **Prefer measurable workflow improvements over abstract features.** "We reduced time-to-first-game by 3 weeks" is a better outcome than "we added AI."
7. **Keep products operationally simple and politically realistic.** A product that requires a chapter to change its bylaws or hire a technical admin won't ship.

### Slice plan and rationale

| Slice | Name | Core deliverable | Why this order |
|---|---|---|---|
| 1 | Lead Capture + Command Center | Public form → lead record; staff pipeline view | Nothing else is possible without a funnel and someone to work it |
| 2 | Registration / Clearance + Timeline + Roster | Structured onboarding workflow, clearance tracking, recruit-facing status page | The funnel is useless if there's no structured path after form submission |
| 3 | Dues / Stripe | Payment processing; makes 10% success fee attributable and collectible | The revenue model depends on being in the payment path |
| 4 | AI Features | Lead scoring, drop-off prediction, campaign drafting | AI needs data to be useful; build the funnel first, improve it with AI second |
| 5 | Workflow Builder + Lifecycle | Chapter-admin config UI; NTBOA/FWBOA onboarding via config | Multi-chapter scale requires self-service configuration, not custom builds |
| 6 | Assigner Hand-off | Cleared-official signal to ArbiterSports | The funnel must close into assignment to complete the recruiting loop |
| 7 | Renewals | Annual season rollover, returning-official re-registration | Retention is the back half of the officiating operating system |
| 8 | Mentor / Referral | Peer mentorship pairing, referral attribution | Higher-order retention mechanism; needs the core platform to mature first |

Each slice ships a vertical cut — schema change, backend logic, and user-facing UI — rather than horizontal layers. Value is delivered at the end of every slice.

---

## AI's role in this phase

**Maturity: AI-Assisted.** An LLM assistant helped articulate the federated-ecosystem framing, the module breakdown, the design principles, and the competitive landscape analysis (`docs/strategy/competitive-brief.md`). It maintains the project memory (`CLAUDE.md`) so product decisions made in one session carry forward to the next.

The human owns the market strategy — specifically the political judgment that chapters must never feel like a vendor is taking over their membership. That judgment shaped every design principle above and cannot be delegated to AI.

---

## Key artifacts

- [`../../CLAUDE.md`](../../CLAUDE.md) — product mission, principles, modules, build priority, file conventions. Source of truth for product scope decisions.
- [`../product/CrewCore Recruit Brief.md`](../product/CrewCore%20Recruit%20Brief.md) — the Recruit module brief (personas, pipeline stages, success metrics, non-goals).
- [`../product/CrewCore-Recruit-Blueprint.md`](../product/CrewCore-Recruit-Blueprint.md) — full product blueprint.
- [`../product/CrewCore-demo.pdf`](../product/CrewCore-demo.pdf) — demo/slide deck for board presentations.
- [`../strategy/competitive-brief.md`](../strategy/competitive-brief.md) — competitive landscape, positioning, monetization. **Read before Slice 3 planning.**
- See the [artifact index](../artifacts/README.md).

---

**Status: ✅ Complete.** Problem, thesis, first market, design principles, and slice plan are decided and stable. They do not change unless DBOA strategy changes or a new beachhead chapter is added.
