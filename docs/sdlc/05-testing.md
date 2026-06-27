# Phase 5 — Testing
**Also known as (AI-era): Evaluation & Validation**
**Status: ⏳ Not yet formalized** — Slice 1 was validated manually; a formal test approach (especially RLS isolation tests) is defined here for the slices ahead.

## Purpose
Prove each slice does what its design said — the capture flow works, and chapter data stays isolated under RLS.

## Process (repeatable)
1. Manually verify the slice's user flow end to end.
2. Verify RLS isolation between chapters.
3. Confirm migrations apply cleanly in order.
4. Add automated checks as the surface grows.

## What we did / plan on CrewCore Recruit

### Slice 1 — what was validated (manual)
- The public lead-capture form loads a chapter by `slug`, renders its branding (`tagline`, `hero_text`, `accent_color`), and submits a lead via `public.submit_lead`.
- `person`, `membership`, and `lead` have no public SELECT — confirmed locked down in Slice 1.
- Migrations apply in order against the Supabase project.

### Defined for the slices ahead (not yet executed)
- **RLS isolation test:** confirm a recruiter for one chapter cannot read another chapter's `person`/`membership`/`lead` — directly or via API — once the Command Center adds authenticated reads.
- **Security-definer boundary test:** confirm the public app can only create leads through `public.submit_lead` and cannot read or write identity tables directly.
- **Onboarding status / magic-link** flows (Slice 2) and **compliance rollup** (Slice 3) get their own flow checks when built.
- No automated unit/integration suite exists yet.

## AI's role in this phase
**Maturity: AI-Assisted.** AI can scaffold RLS-isolation and flow tests as slices land; the human is the acceptance authority for whether chapter-sovereignty and data-isolation guarantees hold.

## Key artifacts
- `supabase/migrations/*` (the RLS policies under test).
- [`../CrewCore-Recruit-SESSION-LOG.md`](../CrewCore-Recruit-SESSION-LOG.md) — records what's verified per slice.
- See the [artifact index](../artifacts/README.md).
