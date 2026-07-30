# Claude Code Prompt — Session Admin: friendlier date/time picker

Frontend-only change to `SessionAdminPage` (`/sessions/admin`), both the **New session** form and the
inline **Edit** form. The native `datetime-local` "mm/dd/yyyy --:-- --" spinners are cumbersome. Replace
them with an easier picker. No DB changes — keep sending the same ISO timestamps to `admin_create_session`
and `admin_update_session` (`p_starts_at`, `p_ends_at`). `npx tsc --noEmit` must be clean. Commit; Marvin pushes.

## Recommended UX (no heavy dependency, least cumbersome)
Replace the two `datetime-local` inputs with **three simple controls**:

1. **Date** — a single date field (a native `<input type="date">` is fine; the pain is the time, not the
   date). Default to today; set `min` to today so past dates can't be picked.
2. **Start time** — a `<select>` dropdown of times in **15-minute increments** (e.g. 7:00 AM, 7:15 AM …
   9:45 PM), not a spinner. Default to a sensible evening slot (e.g. 6:00 PM).
3. **Duration** — a small `<select>` or button group: **1 hr, 1.5 hr, 2 hr, 2.5 hr, 3 hr** (default 2 hr).

From those, compute:
- `starts_at` = the chosen date + start time (local), as an ISO string (`new Date(...).toISOString()`).
- `ends_at`  = starts_at + duration.

This removes manual end-time entry entirely and makes creating a session 3 quick picks. Keep the same
submit calls:
```js
await supabase.rpc('admin_create_session', { p_workflow_step_id, p_title, p_starts_at: startsIso, p_ends_at: endsIso, p_location, p_passcode });
// Edit:
await supabase.rpc('admin_update_session', { p_passcode, p_session_id, p_title, p_starts_at: startsIso, p_ends_at: endsIso, p_location });
```

**Edit form:** when opening Edit, pre-fill Date / Start time / Duration by parsing the session's stored
`starts_at` and `ends_at` (duration = ends − starts, rounded to the nearest 15/30 min; if `ends_at` is
missing, default duration to 2 hr).

## Optional upgrade (nicer calendar)
If you prefer a polished calendar + time picker, `react-datepicker` is fine to add:
`showTimeSelect`, `timeIntervals={15}`, `minDate={today}`, `dateFormat="MMM d, yyyy h:mm aa"`. Use one
picker for Start and either a second for End or the Duration select above. Only add the dependency if it's
clean; the three-control approach above is the priority and needs no new package.

## Notes
- Keep it mobile-friendly (the admin may set this up on a phone).
- Show the computed session time back to the user before/after create (e.g. "Aug 5, 6:00–8:00 PM") so
  they can confirm at a glance.
- Time zone: build the ISO from local date+time as the create form does today — don't change the stored
  format, just the input controls.

## Checklist
- [ ] New session form uses Date + Start-time (15-min) + Duration instead of two datetime-local spinners.
- [ ] Edit form uses the same controls, pre-filled from the session's stored times.
- [ ] starts_at / ends_at still sent as ISO strings to the same RPCs.
- [ ] Past dates blocked; sensible defaults; mobile-friendly.
- [ ] `npx tsc --noEmit` clean; commit.
