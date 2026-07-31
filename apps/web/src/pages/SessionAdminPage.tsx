import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const PASSCODE = 'dboa2026';

type AttendanceStep = { id: string; name: string; sort_order: number };
type SessionRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  attendee_count: number;
};

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400';

const selectCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-slate-400';

// ── Time options: 7:00 AM – 9:45 PM in 15-min increments ─────────────────────
const TIME_OPTIONS: { label: string; value: string }[] = [];
for (let h = 7; h <= 21; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    TIME_OPTIONS.push({ label: `${h12}:${mm} ${period}`, value: `${hh}:${mm}` });
  }
}

const DURATION_OPTIONS = [
  { label: '1 hr', value: 60 },
  { label: '1.5 hr', value: 90 },
  { label: '2 hr', value: 120 },
  { label: '2.5 hr', value: 150 },
  { label: '3 hr', value: 180 },
];

function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildIso(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}`).toISOString();
}

function parseFromIso(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function snapToTimeOption(timeStr: string): string {
  if (TIME_OPTIONS.some((t) => t.value === timeStr)) return timeStr;
  const [hStr, mStr] = timeStr.split(':');
  const totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
  let best = '18:00';
  let bestDiff = Infinity;
  for (const opt of TIME_OPTIONS) {
    const [oh, om] = opt.value.split(':').map(Number);
    const diff = Math.abs(oh * 60 + om - totalMins);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = opt.value;
    }
  }
  return best;
}

function snapDuration(startsIso: string, endsIso: string | null): number {
  if (!endsIso) return 120;
  const diff = (new Date(endsIso).getTime() - new Date(startsIso).getTime()) / 60000;
  return DURATION_OPTIONS.map((d) => d.value).reduce((prev, curr) =>
    Math.abs(curr - diff) < Math.abs(prev - diff) ? curr : prev,
  );
}

function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function fmtRange(startsIso: string, endsIso: string): string {
  const s = new Date(startsIso);
  const e = new Date(endsIso);
  const datePart = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const startTime = s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endTime = e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart}, ${startTime}–${endTime}`;
}

export default function SessionAdminPage() {
  const [passcode, setPasscode] = useState('');
  const [authed, setAuthed] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);

  const [steps, setSteps] = useState<AttendanceStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState('');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Create form
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('18:00');
  const [durationMins, setDurationMins] = useState(120);
  const [minPct, setMinPct] = useState(75);
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedRange, setSavedRange] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('18:00');
  const [editDurationMins, setEditDurationMins] = useState(120);
  const [editLocation, setEditLocation] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [lastDeleteNote, setLastDeleteNote] = useState<string | null>(null);

  useEffect(() => {
    if (!authed) return;
    supabase
      .from('workflow_step')
      .select('id, name, sort_order')
      .eq('step_type', 'attendance')
      .order('sort_order')
      .then(({ data }) => {
        const rows = (data ?? []) as AttendanceStep[];
        setSteps(rows);
        if (rows.length > 0) setSelectedStepId(rows[0].id);
      });
  }, [authed]);

  const loadSessions = async (stepId: string) => {
    if (!stepId) return;
    setLoadingSessions(true);
    const { data } = await (supabase as any).rpc('admin_list_sessions', {
      p_passcode: PASSCODE,
      p_workflow_step_id: stepId,
    });
    setSessions((data ?? []) as SessionRow[]);
    setLoadingSessions(false);
  };

  useEffect(() => {
    if (authed && selectedStepId) loadSessions(selectedStepId);
  }, [authed, selectedStepId]);

  const handlePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === PASSCODE) {
      setAuthed(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStepId || !title || !date || !startTime) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    const startsIso = buildIso(date, startTime);
    const endsIso = new Date(new Date(startsIso).getTime() + durationMins * 60000).toISOString();

    const { error: rpcErr } = await (supabase as any).rpc('admin_create_session', {
      p_workflow_step_id: selectedStepId,
      p_title: title,
      p_starts_at: startsIso,
      p_ends_at: endsIso,
      p_location: location || null,
      p_min_pct: minPct,
      p_passcode: PASSCODE,
    });

    if (rpcErr) {
      setSaveError(rpcErr.message ?? 'Failed to create session.');
      setSaving(false);
      return;
    }

    setSavedRange(fmtRange(startsIso, endsIso));
    setSaved(true);
    setTitle('');
    setDate(todayStr());
    setStartTime('18:00');
    setDurationMins(120);
    setMinPct(75);
    setLocation('');
    setSaving(false);
    loadSessions(selectedStepId);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────────

  const startEdit = (s: SessionRow) => {
    const { date: d, time: t } = parseFromIso(s.starts_at);
    setEditingId(s.id);
    setEditTitle(s.title);
    setEditDate(d);
    setEditStartTime(snapToTimeOption(t));
    setEditDurationMins(snapDuration(s.starts_at, s.ends_at));
    setEditLocation(s.location ?? '');
    setEditError(null);
    setDeletingId(null);
    setLastDeleteNote(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle || !editDate || !editStartTime) return;
    setEditSaving(true);
    setEditError(null);

    const startsIso = buildIso(editDate, editStartTime);
    const endsIso = new Date(
      new Date(startsIso).getTime() + editDurationMins * 60000,
    ).toISOString();

    const { error } = await (supabase as any).rpc('admin_update_session', {
      p_passcode: PASSCODE,
      p_session_id: id,
      p_title: editTitle,
      p_starts_at: startsIso,
      p_ends_at: endsIso,
      p_location: editLocation || null,
    });

    setEditSaving(false);

    if (error) {
      setEditError(error.message ?? 'Failed to update session.');
      return;
    }

    setEditingId(null);
    loadSessions(selectedStepId);
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async (id: string) => {
    setDeleteBusy(true);
    setLastDeleteNote(null);

    const { data, error } = await (supabase as any).rpc('admin_delete_session', {
      p_passcode: PASSCODE,
      p_session_id: id,
    });

    setDeleteBusy(false);
    setDeletingId(null);

    if (!error && data?.deleted_attendance > 0) {
      setLastDeleteNote(
        `Session deleted — removed ${data.deleted_attendance} check-in${data.deleted_attendance === 1 ? '' : 's'}.`,
      );
    }

    loadSessions(selectedStepId);
  };

  // ── Computed previews ─────────────────────────────────────────────────────────

  const previewRange =
    date && startTime
      ? fmtRange(
          buildIso(date, startTime),
          new Date(
            new Date(buildIso(date, startTime)).getTime() + durationMins * 60000,
          ).toISOString(),
        )
      : '';

  const editPreviewRange =
    editDate && editStartTime
      ? fmtRange(
          buildIso(editDate, editStartTime),
          new Date(
            new Date(buildIso(editDate, editStartTime)).getTime() + editDurationMins * 60000,
          ).toISOString(),
        )
      : '';

  // ── Auth gate ─────────────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="mb-1 text-lg font-semibold text-slate-900">Staff access</h1>
            <p className="mb-4 text-sm text-slate-500">
              Session administration requires staff login.
            </p>
            <form onSubmit={handlePasscode} className="flex flex-col gap-3">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Staff passcode"
                autoFocus
                className={inputCls}
              />
              {passcodeError ? (
                <p className="text-sm text-rose-600">Incorrect passcode.</p>
              ) : null}
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Enter
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Session admin</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage attendance sessions.</p>
        </header>

        {/* Step picker */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            Attendance step
            <select
              value={selectedStepId}
              onChange={(e) => {
                setSelectedStepId(e.target.value);
                setSaved(false);
                setEditingId(null);
                setDeletingId(null);
                setLastDeleteNote(null);
              }}
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
            >
              {steps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Create form */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">New session</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <label className="block text-sm font-semibold text-slate-700">
              Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. General Meeting — Aug 12"
                className={`mt-1.5 ${inputCls}`}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm font-semibold text-slate-700">
                Date
                <input
                  type="date"
                  value={date}
                  min={todayStr()}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className={`mt-1.5 ${inputCls}`}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Start time
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`mt-1.5 ${selectCls}`}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Duration
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className={`mt-1.5 ${selectCls}`}
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {previewRange ? (
              <p className="text-xs font-medium text-slate-500">{previewRange}</p>
            ) : null}

            <label className="block text-sm font-semibold text-slate-700">
              Location
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Richland Hills Rec Center"
                className={`mt-1.5 ${inputCls}`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Minimum presence to count
              <select
                value={minPct}
                onChange={(e) => setMinPct(Number(e.target.value))}
                className={`mt-1.5 ${selectCls}`}
              >
                <option value={0}>No minimum — any check-out counts</option>
                <option value={50}>50% of the meeting</option>
                <option value={75}>75% of the meeting</option>
                <option value={90}>90% of the meeting</option>
                <option value={100}>100% — full meeting</option>
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                An official must be checked in for at least this share of the scheduled length
                (check-in to check-out) to be marked present; shorter visits are flagged for review.
              </span>
            </label>

            {saveError ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {saveError}
              </p>
            ) : null}
            {saved ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Session created — {savedRange}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving || !title || !date}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create session'}
            </button>
          </form>
        </div>

        {/* Session list */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Sessions</h2>

          {lastDeleteNote ? (
            <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {lastDeleteNote}
            </p>
          ) : null}

          {loadingSessions ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-400">No sessions yet for this step.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <li key={s.id} className="py-4">
                  {editingId === s.id ? (
                    /* ── Inline edit form ── */
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Edit session
                      </p>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                        className={inputCls}
                      />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <p className="mb-1 text-xs font-semibold text-slate-600">Date</p>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-semibold text-slate-600">Start time</p>
                          <select
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className={selectCls}
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-semibold text-slate-600">Duration</p>
                          <select
                            value={editDurationMins}
                            onChange={(e) => setEditDurationMins(Number(e.target.value))}
                            className={selectCls}
                          >
                            {DURATION_OPTIONS.map((d) => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {editPreviewRange ? (
                        <p className="text-xs font-medium text-slate-500">{editPreviewRange}</p>
                      ) : null}
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="Location (optional)"
                        className={inputCls}
                      />
                      {editError ? (
                        <p className="text-sm text-rose-600">{editError}</p>
                      ) : null}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={editSaving || !editTitle || !editDate}
                          onClick={() => handleSaveEdit(s.id)}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                        >
                          {editSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Session row ── */
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {fmtDateTime(s.starts_at)}
                            {s.ends_at ? ` – ${fmtDateTime(s.ends_at)}` : ''}
                            {s.location ? ` · ${s.location}` : ''}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {s.attendee_count === 0
                              ? '0 checked in'
                              : `${s.attendee_count} checked in`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(s)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          {deletingId === s.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Delete?</span>
                              <button
                                type="button"
                                disabled={deleteBusy}
                                onClick={() => handleDeleteConfirm(s.id)}
                                className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                              >
                                {deleteBusy ? '…' : 'Yes'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingId(s.id);
                                setEditingId(null);
                                setLastDeleteNote(null);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Kiosk link */}
                      <div className="mt-2">
                        <a
                          href={`/kiosk/${s.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Open QR kiosk ↗
                        </a>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
