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
};

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400';

export default function SessionAdminPage() {
  const [passcode, setPasscode] = useState('');
  const [authed, setAuthed] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);

  const [steps, setSteps] = useState<AttendanceStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState('');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
    const { data } = await (supabase as any)
      .from('session')
      .select('id, title, starts_at, ends_at, location')
      .eq('workflow_step_id', stepId)
      .order('starts_at');
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
    if (!selectedStepId || !title || !startsAt) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    const { error: rpcErr } = await (supabase as any).rpc('admin_create_session', {
      p_workflow_step_id: selectedStepId,
      p_title: title,
      p_starts_at: new Date(startsAt).toISOString(),
      p_ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      p_location: location || null,
      p_passcode: PASSCODE,
    });

    if (rpcErr) {
      setSaveError(rpcErr.message ?? 'Failed to create session.');
      setSaving(false);
      return;
    }

    setSaved(true);
    setTitle('');
    setStartsAt('');
    setEndsAt('');
    setLocation('');
    setSaving(false);
    loadSessions(selectedStepId);
  };

  const fmtDateTime = (ts: string) =>
    new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="mb-1 text-lg font-semibold text-slate-900">Staff access</h1>
            <p className="mb-4 text-sm text-slate-500">Session administration requires staff login.</p>
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

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Session admin</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create attendance sessions. QR kiosk link appears in the session list.
          </p>
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
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-slate-700">
                Starts at
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                  className={`mt-1.5 ${inputCls}`}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Ends at
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className={`mt-1.5 ${inputCls}`}
                />
              </label>
            </div>
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
            {saveError ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {saveError}
              </p>
            ) : null}
            {saved ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Session created.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={saving || !title || !startsAt}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create session'}
            </button>
          </form>
        </div>

        {/* Session list */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Sessions</h2>
          {loadingSessions ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-400">No sessions yet for this step.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <li key={s.id} className="py-3">
                  <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {fmtDateTime(s.starts_at)}
                    {s.ends_at ? ` – ${fmtDateTime(s.ends_at)}` : ''}
                    {s.location ? ` · ${s.location}` : ''}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-slate-300">
                    Kiosk: /kiosk/{s.id}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
