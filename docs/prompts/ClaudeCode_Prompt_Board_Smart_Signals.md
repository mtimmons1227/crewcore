# Claude Code task — Board dashboard: surface the new "smart signals"

## Context
The `get_board_roster(p_chapter_slug)` Postgres RPC (Supabase) has already been upgraded
and deployed. It now returns richer, more actionable fields. **No DB work is needed** — this
task is **frontend only**: update the board dashboard page (route `/board`) to display the new
data. Keep the existing look/feel (same cards, table, mobile-first layout); we're adding
signal, not redesigning.

The core idea: the board should stop measuring recruits against *all 11 steps* and instead
show (a) whether they're **cleared to work their first paid game**, and (b) whether they've
**gone stalled** (idle too long on a step they can actually act on now).

## New data contract (what the RPC now returns)

`kpis` object:
- `recruits` (int)
- `dues_paid` (int)
- `cleared` (int) — recruits who finished **all** steps (will usually be 0; keep but de-emphasize)
- `cleared_to_work` (int) — **NEW** — recruits who finished the first-paid-game gate
- `attention` (int) — **now meaningful** = count stalled OR overdue
- `stalled` (int) — **NEW**
- `overdue` (int) — **NEW**
- `dues_collected` (number, dollars)

`settings` object:
- `stalled_days` (int) — the idle-days threshold used to compute "stalled" (currently 5).
  Use this to label things dynamically (e.g., "No activity in 5+ days").

Each entry in `recruits[]` now includes (in addition to the existing fields):
- `status` (string) — `"complete"` | `"stalled"` | `"in_progress"` (unchanged shape)
- `cleared_to_work` (bool) — **NEW** — passed the first-paid-game gate
- `fg_done` (int), `fg_total` (int) — **NEW** — progress toward that gate (e.g., 3 of 5)
- `days_idle` (int) — **NEW** — days since last completed step (or since sign-up)
- `open_now` (int) — **NEW** — how many steps they can act on right now
- `next_step` (string|null) — **NEW** — the name of the step they should do next
- `overdue` (bool) — **NEW** — has a step past its due date, still incomplete
- (existing, still present) `full_name`, `email`, `member_type`, `access_token`,
  `total_steps`, `complete_steps`, `pct`, `last_activity`, `dues_paid`, `state_status`

The array is already **sorted stalled-first**, then not-yet-cleared, then by progress.

## Changes to make

### 1. KPI tiles
- Replace the **"Fully Cleared"** tile with **"Cleared to Work"**, bound to
  `kpis.cleared_to_work` (show as `cleared_to_work / recruits`, e.g. `0 / 4`). Add a small
  subcaption like "ready for first paid game."
- Keep **"Needs Attention"** bound to `kpis.attention` (it's now real). If `attention > 0`,
  give the tile a subtle amber accent so it draws the eye.
- Optional: keep the all-steps `kpis.cleared` number only if you want a secondary
  "Season complete" stat; otherwise drop it. Don't feature it prominently.

### 2. Roster table — new columns
Add two columns (and keep them readable on mobile — collapse into the row's secondary line
if width is tight):
- **Next step** ← `next_step` (what they're waiting on). Show "—" if null.
- **Idle** ← `days_idle`, formatted like `27d`. If `days_idle > settings.stalled_days`,
  color it amber/red.

### 3. Progress → show the "first game" gate
Alongside the existing overall progress (`pct`, `complete_steps/total_steps`), show the
first-paid-game progress using `fg_done`/`fg_total` (e.g., a small "First game: 3/5" chip or a
second thin progress bar). When `cleared_to_work` is true, show a green **"Cleared to work ✅"**
badge instead.

### 4. Stalled + overdue emphasis
- Rows where `status === "stalled"`: add a left border / row tint (amber) and a small
  **"Stalled · {days_idle}d"** badge so they're impossible to miss.
- Rows where `overdue === true`: add a red **"Overdue"** badge.

### 5. Filter tabs
- The existing tabs (All / In progress / Stalled / Complete) still work off `status`.
  The **Stalled** tab is now genuinely populated — make sure its count reflects
  `status === "stalled"`.
- Add a **"Cleared to work"** filter that shows recruits where `cleared_to_work === true`.

### 6. Empty/nice-to-have
- If a recruit is `in_progress`, `days_idle` small, and not cleared, that's the healthy
  normal state — no badge needed.
- Keep it read-only (board members view only). No new mutations.

## Acceptance
- "Cleared to Work" KPI shows `0 / 4` on current data.
- "Needs Attention" shows `2` and its tile is accented.
- Aaron Hill and Marvin Timmons render with a **Stalled · 27d** badge and amber row.
- Every row shows a **Next step** ("DBOA new officials training" for all four right now)
  and an **Idle** value (27d for the two stalled, 0d for the two demo recruits).
- Jordan and Riley show as healthy in-progress (no stalled badge).
- Nothing else on the page regressed; still mobile-friendly.

## Notes
- All values come straight from `get_board_roster` — no extra queries.
- Don't hardcode the 5-day threshold in the UI; read `settings.stalled_days` so it stays in
  sync if we tune it server-side.
- Commit as normal; Marvin will `git push`.
