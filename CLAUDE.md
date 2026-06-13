# CrewCore

CrewCore is the operating system for sports officials.

## Product mission
CrewCore is a chapter-controlled officiating ecosystem designed to recruit, develop, assign, support, and retain sports officials while preserving chapter autonomy.

## Initial market
The first market is Dallas-area high school basketball chapters:
- DBOA
- NTBOA
- FWBOA

## Core design principles
- Preserve chapter sovereignty
- Build simple workflows with innovative outcomes
- Use AI only where it adds practical value
- Design for chapters and assigners first
- Start as an overlay ecosystem, not a forced replacement of existing systems
- Prefer measurable workflow improvements over abstract features
- Keep products operationally simple and politically realistic

## Current ecosystem vision
CrewCore is a federated officiating ecosystem, not a chapter takeover system.

Each chapter keeps:
- leadership
- dues
- bylaws
- training culture
- evaluation process
- playoff eligibility rules
- school relationships

CrewCore provides shared ecosystem services:
- recruiting and onboarding
- official identity and profile management
- controlled exchange for uncovered games
- training and development support
- evaluation and readiness tracking
- payment workflow visibility
- reporting and insights

## Product modules
- CrewCore Recruit
- CrewCore Exchange
- CrewCore Academy
- CrewCore Payouts
- CrewCore Insights

## Current build priority
Current focus: CrewCore Recruit

CrewCore Recruit should:
- recruit, capture, and convert new officials through a structured onboarding funnel
- support chapter-specific recruiting workflows
- reduce onboarding drop-off
- route recruits intelligently
- use AI for lead scoring, drop-off prediction, shortage-zone targeting, campaign drafting, and readiness summaries

## Key workflow order
When designing a module, work in this order:
1. Product blueprint
2. User flow
3. Data model / schema
4. UI architecture
5. AI feature design
6. Campaign / automation logic
7. PRD
8. Implementation plan
9. Code

## File conventions
- Product docs go in /docs/product
- Architecture docs go in /docs/architecture
- Project decisions go in /docs/decisions
- Reusable prompts go in /docs/prompts
- Frontend app code goes in /apps/web
- Backend/API code goes in /services/api
- Shared types/utilities go in /packages/shared

## Coding and architecture rules
- Prefer clear, modular architecture
- Avoid hardcoded values
- Use environment variables for secrets and configuration
- Keep modules loosely coupled
- Add validation and error handling
- Favor readable naming and practical implementations
- Do not over-engineer early versions
- Build with future multi-tenant chapter support in mind

## Output rules for Claude
- Read this file before making major decisions
- Summarize your plan before coding
- Write design outputs into markdown files under /docs
- Propose file changes before editing multiple files
- Keep explanations structured and implementation-ready
- Treat previous approved docs as source of truth