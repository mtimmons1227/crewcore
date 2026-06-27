# Phase 1 — Planning
**Also known as (AI-era): Problem Framing & Scope Definition**
**Status: ✅ Complete**

## Purpose
Identify the scope and purpose of the software before any code: what we're building, why, who it's for, and what's in scope.

## Process (repeatable)
1. Frame the problem and name the primary users.
2. State the mission and design principles.
3. Set the scope — what's in, and explicitly out.
4. Name high-level success criteria.
5. Capture constraints (market, political, operational).

## What we did on CrewCore

**Problem.** Sports-officials chapters struggle to recruit, develop, assign, support, and retain officials — while fiercely protecting their autonomy. Existing systems either don't help with recruiting/onboarding or threaten to replace the chapter entirely.

**Mission.** CrewCore is the operating system for sports officials: a **chapter-controlled, federated officiating ecosystem** that recruits, develops, assigns, supports, and retains officials **while preserving chapter sovereignty**. It is an overlay ecosystem, not a chapter takeover.

**Primary users.** Chapter recruiter, chapter admin, assigner, trainer, and the prospect official.

**Initial market.** Dallas-area high school basketball chapters: **DBOA, NTBOA, FWBOA**.

**Design principles.** Preserve chapter sovereignty; simple workflows with innovative outcomes; use AI only where it adds practical value; design for chapters and assigners first; start as an overlay, not a forced replacement; prefer measurable workflow improvements over abstract features; keep products operationally simple and politically realistic.

**Scope — the ecosystem (modules).** CrewCore **Recruit**, **Exchange**, **Academy**, **Payouts**, and **Insights**. Each chapter keeps its leadership, dues, bylaws, training culture, evaluation process, playoff-eligibility rules, and school relationships; CrewCore provides shared services (recruiting/onboarding, identity/profile, controlled exchange for uncovered games, training/development, evaluation/readiness, payment visibility, reporting/insights).

**Current build priority (in scope now).** **CrewCore Recruit** — recruit, capture, and convert new officials through a structured onboarding funnel, support chapter-specific recruiting workflows, reduce onboarding drop-off, route recruits intelligently, and (later) use AI for lead scoring, drop-off prediction, shortage-zone targeting, campaign drafting, and readiness summaries.

**Out of scope for now.** The other four modules (Exchange, Academy, Payouts, Insights) and the AI features — recorded in [08-future-releases.md](08-future-releases.md).

**High-level success criteria.** A chapter-branded public lead-capture funnel that converts prospects, a recruiter Command Center to manage incoming interest, reduced onboarding drop-off, and correct routing of recruits to the right chapter — all without compromising chapter autonomy.

## AI's role in this phase
**Maturity: AI-Assisted.** An LLM assistant helped articulate the federated-ecosystem framing, the module breakdown, and the design principles, and maintains the project memory (`CLAUDE.md`). The human owns the market strategy and the political realism of chapter sovereignty.

## Key artifacts
- [`../../CLAUDE.md`](../../CLAUDE.md) — product mission, principles, modules, build priority, conventions.
- [`../product/CrewCore Recruit Brief.md`](../product/CrewCore%20Recruit%20Brief.md) — the Recruit module brief.
- [`../product/CrewCore-Recruit-Blueprint.md`](../product/CrewCore-Recruit-Blueprint.md), [`../product/CrewCore-demo.pdf`](../product/CrewCore-demo.pdf).
- See the [artifact index](../artifacts/README.md).
