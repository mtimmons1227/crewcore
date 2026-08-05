# Claude Code task — Fix the fees-strip contrast bug (recruit page)

## The bug
On the recruit page (the mobile-first CrewCore recruit view — `RecruitMenuPage.tsx` or the fees
component it renders), the **"earn it back" / ROI line** at the top uses **green text on a blue
background**, which is unreadable. The green foreground and the blue fees-strip background don't
have enough contrast.

## The fix
Make the "earn it back" callout legible by giving it its **own light-emerald treatment** instead
of sitting on the blue strip — matching the approved mock. Specifically:

- Put the ROI/"earn it back in ~5 games" line in its own pill/box with a **light emerald
  background** and **dark emerald text**, e.g.:
  - background: `#ecfdf5` (emerald-50) — or a subtle emerald tint
  - text: `#047857` / `#065f46` (emerald-700/800)
  - optional: a thin emerald border `#a7f3d0`
- Do **not** leave green text directly on the blue (`#dbeafe`-ish) fees background.
- Keep the rest of the fees strip as-is (the fees themselves, the total, the collapsible behavior).

Reference: this is exactly how the approved mock renders it — the ROI line is:
`💰 Earn it back in ~5 games — then every whistle is profit.` on a light emerald background with
emerald text (readable), not green-on-blue.

## Acceptance
- The "earn it back" text is clearly readable on a phone.
- Contrast passes a basic legibility check (dark emerald text on light emerald bg).
- Nothing else in the fees strip changed.

## Note
Commit as normal; Marvin will `git push`.
