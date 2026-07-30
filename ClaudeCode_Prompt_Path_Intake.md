# Claude Code task — Member-type path intake + path-aware recruit view

## Context (backend is DONE — do not change the DB)
The Supabase engine now assembles a different checklist per member type. Applied live:
- `start_registration(p_email, p_chapter_id, p_sport_id, p_season_id, p_member_type)` now honors
  `p_member_type` and generates only the steps whose `audience` includes that type.
  Allowed values: `new` | `returning` | `transfer` | `reinstating` | `add_sport`. Default `new`.
  Verified step counts for DBOA basketball: **new → 11, returning → 9, transfer → 4**.
- `get_registration(token)` already returns `cycle.member_type`.

This task is **frontend only**: let the official pick their path, pass it through, and reflect it.

## 1. Path-selection intake (before `start_registration` is called)
Find where the app currently calls `start_registration` (the "begin registration" entry point).
Add a short selection step *before* that call — "Which best describes you?" — with three options
(map to the `p_member_type` arg):
- **New to officiating** → `new`
- **Returning official** (renewing with DBOA) → `returning`
- **Transferring in** (certified with another chapter/association) → `transfer`

Pass the chosen value as `p_member_type` into the existing `start_registration` call. If somehow
nothing is chosen, default to `new` (backward-safe).

Keep it lightweight and mobile-first, consistent with the current recruit UI. This does not need
its own route — a simple choice card/step before the checklist loads is fine.

## 2. Path-aware messaging on the recruit view
`get_registration` returns `cycle.member_type`. Use it to tailor the header/intro copy:
- `new` → current copy ("Your path to officiating").
- `returning` → e.g. "Welcome back — let's get you renewed for the season." Framing: renewal, not
  starting over.
- `transfer` → e.g. "Welcome to DBOA. We've recognized what you already hold — here's what's left
  to join us locally." Framing: we recognize your credentials; short list.

Everything else on the checklist UI already works, because it just renders whatever steps
`get_registration` returns — so a returning official naturally sees ~9 steps and a transfer ~4,
with the existing "steps to first paid game" counters deriving correctly from that shorter set.

## 3. Acceptance
- Choosing "Returning" produces a registration with ~9 steps; "Transferring in" ~4; "New" 11.
- The recruit header copy changes to match the chosen path.
- No route or checklist regressions for the existing `new` flow.

## Notes / not in scope
- The transfer path currently reflects the **same-season transfer** common case (state-tier
  credentials — state dues, background check, state test — are assumed already held this season and
  are not shown). New-season transfer and true credential carry-forward come later (they need the
  credential ledger from `RefNet_Portability_and_Multi_State_Architecture.md`). Don't build that now.
- Commit as normal; Marvin will `git push`.
