import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const PASSCODE = 'dboa2026';

type RosterRow = {
  person_id: string;
  full_name: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  status: string;
  min_pct: number;
  present_pct: number | null;
  overridden_by: string | null;
  override_reason: string | null;
  overridden_at: string | null;
};

type SessionMeta = {
  id: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  min_pct: number;
  step_name: string | null;
};

type Summary = {
  total: number;
  attended: number;
  partial: number;
  needs_review: number;
  checked_in: number;
};

type RosterData = { session: SessionMeta; summary: Summary; roster: RosterRow[] };

const ATT_STATUS_META: Record<string, { label: string; cls: string }> = {
  attended: { label: 'Attended', cls: 'bg-emerald-50 text-emerald-700' },
  partial: { label: 'Partial', cls: 'bg-amber-50 text-amber-700' },
  needs_review: { label: 'Needs review', cls: 'bg-rose-50 text-rose-700' },
  checked_in: { label: 'Checked in', cls: 'bg-sky-50 text-sky-700' },
};
function attMeta(st: string) {
  return ATT_STATUS_META[st] ?? { label: st, cls: 'bg-slate-100 text-slate-600' };
}
function fmtClock(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function fmtWhen(startIso: string | null, endIso: string | null): string {
  if (!startIso) return '';
  const start = new Date(startIso);
  const datePart = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (!endIso) return `${datePart}, ${startTime}`;
  const endTime = new Date(endIso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart}, ${startTime} – ${endTime}`;
}

const FILTERS: { key: string; label: string }[] = [
  { key: 'attention', label: 'Needs attention' },
  { key: 'all', label: 'All' },
  { key: 'attended', label: 'Attended' },
  { key: 'partial', label: 'Partial' },
  { key: 'needs_review', label: 'Needs review' },
  { key: 'checked_in', label: 'Checked in' },
];

const RENDER_CAP = 150;

export default function SessionAttendancePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [passcode, setPasscode] = useState('');
  const [authed, setAuthed] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);

  const [data, setData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filter, setFilter] = useState('attention');
  const [search, setSearch] = useState('');

  const [adminName, setAdminName] = useState<string>(() => {
    try {
      return localStorage.getItem('refnet_admin_name') ?? '';
    } catch {
      return '';
    }
  });
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('attended');
  const [statusReason, setStatusReason] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusErr, setStatusErr] = useState<string | null>(null);

  const fetchRoster = async () => {
    if (!sessionId) return;
    setLoading(true);
    setLoadError(null);
    const { data: d, error } = await (supabase as any).rpc('admin_session_roster', {
      p_passcode: PASSCODE,
      p_session_id: sessionId,
    });
    if (error) {
      setLoadError(error.message ?? 'Failed to load attendance.');
      setLoading(false);
      return;
    }
    setData(d as RosterData);
    setLoading(false);
  };

  useEffect(() => {
    if (authed) fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, sessionId]);

  const handlePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === PASSCODE) {
      setAuthed(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const beginStatus = (r: RosterRow) => {
    setEditPersonId(r.person_id);
    setNewStatus(r.status === 'attended' ? 'partial' : 'attended');
    setStatusReason('');
    setStatusErr(null);
  };

  const applyStatus = async (personId: string) => {
    if (!sessionId) return;
    if (!adminName.trim()) {
      setStatusErr('Enter your name first.');
      return;
    }
    if (!statusReason.trim()) {
      setStatusErr('Enter a reason for the change.');
      return;
    }
    setStatusBusy(true);
    setStatusErr(null);
    try {
      localStorage.setItem('refnet_admin_name', adminName.trim());
    } catch {
      /* ignore */
    }
    const { error } = await (supabase as any).rpc('admin_set_attendance_status', {
      p_passcode: PASSCODE,
      p_session_id: sessionId,
      p_person_id: personId,
      p_status: newStatus,
      p_actor: adminName.trim(),
      p_reason: statusReason.trim(),
    });
    setStatusBusy(false);
    if (error) {
      setStatusErr(error.message ?? 'Failed to update status.');
      return;
    }
    setEditPersonId(null);
    fetchRoster();
  };

  const filtered = useMemo(() => {
    const rows = data?.roster ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'attention'
            ? r.status === 'needs_review' || r.status === 'partial'
            : r.status === filter;
      const matchesSearch = q === '' || (r.full_name ?? '').toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [data, filter, search]);

  if (!authed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-6">
        <div className="w-full max-w-xs">
          <h1 className="mb-2 text-center text-2xl font-bold text-white">Attendance</h1>
          <p className="mb-6 text-center text-sm text-slate-400">Staff access required</p>
          <form onSubmit={handlePasscode} className="flex flex-col gap-3">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Staff passcode"
              autoFocus
              className="rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-400"
            />
            {passcodeError ? <p className="text-sm text-rose-400">Incorrect passcode.</p> : null}
            <button
              type="submit"
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  const s = data?.session;
  const sum = data?.summary;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <Link to="/sessions/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
        ← Back to sessions
      </Link>

      <div className="mt-3">
        {s?.step_name ? (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            {s.step_name}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{s?.title ?? 'Attendance'}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {fmtWhen(s?.starts_at ?? null, s?.ends_at ?? null)}
          {s?.location ? ` · ${s.location}` : ''}
          {s ? ` · needs ${s.min_pct}% present to count` : ''}
        </p>
      </div>

      {sum ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{sum.total} total</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{sum.attended} attended</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{sum.partial} partial</span>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">{sum.needs_review} need review</span>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{sum.checked_in} still in</span>
        </div>
      ) : null}

      <label className="mt-5 block text-xs font-semibold text-slate-600">
        Your name (recorded with any change)
        <input
          type="text"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          placeholder="e.g. Coordinator name"
          className="mt-1 w-full max-w-sm rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-400"
        />
      </label>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === f.key
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-400 sm:w-56"
        />
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading roster…</p>
      ) : loadError ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {loadError}
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          {(data?.roster?.length ?? 0) === 0
            ? 'No one has checked in yet.'
            : 'No one matches this filter.'}
        </p>
      ) : (
        <>
          <p className="mt-5 text-xs text-slate-400">
            Showing {Math.min(filtered.length, RENDER_CAP)} of {filtered.length}
            {filtered.length > RENDER_CAP ? ' — narrow with search or a filter' : ''}
          </p>
          <ul className="mt-2 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {filtered.slice(0, RENDER_CAP).map((r) => (
              <li key={r.person_id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{r.full_name ?? 'Unknown'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      In {fmtClock(r.check_in_at)} · Out {fmtClock(r.check_out_at)}
                      {r.present_pct != null ? ` · present ${r.present_pct}% (needs ${r.min_pct}%)` : ''}
                    </p>
                    {r.overridden_by ? (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Changed by {r.overridden_by}
                        {r.override_reason ? ` — ${r.override_reason}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${attMeta(r.status).cls}`}
                    >
                      {attMeta(r.status).label}
                    </span>
                    {editPersonId === r.person_id ? null : (
                      <button
                        type="button"
                        onClick={() => beginStatus(r)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        Change
                      </button>
                    )}
                  </div>
                </div>

                {editPersonId === r.person_id ? (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-slate-400"
                      >
                        <option value="attended">Attended (counts)</option>
                        <option value="partial">Partial (doesn't count)</option>
                        <option value="needs_review">Needs review</option>
                        <option value="checked_in">Checked in</option>
                      </select>
                      <input
                        type="text"
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder="Reason (required)"
                        className="min-w-[8rem] flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-slate-400"
                      />
                    </div>
                    {statusErr ? <p className="mt-1.5 text-[11px] text-rose-600">{statusErr}</p> : null}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={statusBusy}
                        onClick={() => applyStatus(r.person_id)}
                        className="rounded-lg bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                      >
                        {statusBusy ? 'Saving…' : 'Save change'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditPersonId(null);
                          setStatusErr(null);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
