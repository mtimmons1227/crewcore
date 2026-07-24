import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui';

// DEMO-GRADE AUTH — this passcode gate is for the DBOA board demo only.
// Before production: replace with real board-member auth — RLS policy on
// get_board_roster restricted to a board_member role, verified via a
// Supabase session (email magic link or SSO). The sessionStorage flag and
// VITE_BOARD_PASSCODE env var must be removed entirely.
const PASSCODE = import.meta.env.VITE_BOARD_PASSCODE ?? 'dboa2026';
const STORAGE_KEY = 'board_unlocked_v1';

// ── Types ─────────────────────────────────────────────────────────────────────

type StateStatus = 'complete' | 'available' | 'in_progress' | 'locked' | null;
type OverallStatus = 'in_progress' | 'stalled' | 'complete';
type FilterKey = 'all' | OverallStatus;

type Recruit = {
  full_name: string;
  email: string;
  member_type: string;
  access_token: string;
  total_steps: number;
  complete_steps: number;
  pct: number;
  last_activity: string | null;
  dues_paid: boolean;
  state_status: StateStatus;
  status: OverallStatus;
};

type BoardRoster = {
  chapter: { slug: string; name: string };
  kpis: {
    recruits: number;
    dues_paid: number;
    cleared: number;
    attention: number;
    dues_collected: number; // in dollars (RPC returns dollars, not cents)
  };
  recruits: Recruit[];
};

// get_board_roster is not yet in the generated DB types.

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706'];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function formatActivity(date: string | null): string {
  if (!date) return 'No activity';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDues(dollars: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dollars);
}

// ── Pill ─────────────────────────────────────────────────────────────────────

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      className="inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}

function StatusPill({ status }: { status: OverallStatus }) {
  const map: Record<OverallStatus, { label: string; bg: string; color: string }> = {
    in_progress: { label: 'In progress', bg: '#dbeafe', color: '#2563eb' },
    stalled: { label: 'Stalled', bg: '#ffe4e6', color: '#e11d48' },
    complete: { label: 'Complete', bg: '#dcfce7', color: '#16a34a' },
  };
  const { label, bg, color } = map[status];
  return <Pill label={label} bg={bg} color={color} />;
}

function DuesPill({ paid }: { paid: boolean }) {
  return paid ? (
    <Pill label="Paid" bg="#dcfce7" color="#16a34a" />
  ) : (
    <Pill label="Unpaid" bg="#ffe4e6" color="#e11d48" />
  );
}

function StateRegPill({ stateStatus }: { stateStatus: StateStatus }) {
  if (stateStatus === 'complete') return <Pill label="Confirmed" bg="#dcfce7" color="#16a34a" />;
  if (stateStatus === 'available' || stateStatus === 'in_progress')
    return <Pill label="Awaiting" bg="#fef3c7" color="#b45309" />;
  return <Pill label="Not started" bg="#f1f5f9" color="#64748b" />;
}

function MemberTypePill({ type }: { type: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    new: { label: 'New', bg: '#dbeafe', color: '#2563eb' },
    returning: { label: 'Returning', bg: '#dcfce7', color: '#16a34a' },
    transfer: { label: 'Transfer', bg: '#fef3c7', color: '#b45309' },
  };
  const s = map[type] ?? { label: type, bg: '#f1f5f9', color: '#64748b' };
  return <Pill label={s.label} bg={s.bg} color={s.color} />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BoardDashboardPage() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === '1',
  );
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  const [roster, setRoster] = useState<BoardRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<'progress' | 'name'>('progress');

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    // Cast the client (not the method) to preserve `this` binding inside rpc().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .rpc('get_board_roster', { p_chapter_slug: 'DBOA' })
      .then(({ data, error }: { data: unknown; error: { message: string } | null }) => {
        if (cancelled) return;
        if (error) {
          setFetchError(error.message ?? 'Failed to load roster.');
        } else {
          setRoster(data as BoardRoster);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [unlocked]);

  // ── Passcode gate ──────────────────────────────────────────────────────────

  if (!unlocked) {
    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (passcode.trim() === PASSCODE) {
        sessionStorage.setItem(STORAGE_KEY, '1');
        setUnlocked(true);
      } else {
        setPasscodeError(true);
      }
    };

    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            RefNet · Board
          </div>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">Board access</h1>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <input
              type="password"
              autoFocus
              placeholder="Passcode"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setPasscodeError(false);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
            {passcodeError ? (
              <p className="text-sm text-rose-600">Incorrect passcode.</p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="pt-8">
        <p className="text-sm text-slate-500">Loading roster…</p>
      </div>
    );
  }

  if (fetchError || !roster) {
    return (
      <div className="pt-6">
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {fetchError ?? 'Unable to load board roster.'}
        </p>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const { chapter, kpis, recruits } = roster;

  const counts: Record<FilterKey, number> = {
    all: recruits.length,
    in_progress: recruits.filter((r) => r.status === 'in_progress').length,
    stalled: recruits.filter((r) => r.status === 'stalled').length,
    complete: recruits.filter((r) => r.status === 'complete').length,
  };

  const filtered = recruits
    .filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) =>
      sort === 'name' ? a.full_name.localeCompare(b.full_name) : b.pct - a.pct,
    );

  const kpiCards = [
    { label: 'Recruits', value: String(kpis.recruits), cls: 'text-slate-900' },
    { label: 'Dues paid', value: `${kpis.dues_paid} / ${kpis.recruits}`, cls: 'text-slate-900' },
    { label: 'Fully cleared', value: `${kpis.cleared} / ${kpis.recruits}`, cls: 'text-slate-900' },
    {
      label: 'Needs attention',
      value: String(kpis.attention),
      cls: kpis.attention > 0 ? 'text-rose-600' : 'text-slate-900',
    },
    { label: 'Dues collected', value: formatDues(kpis.dues_collected), cls: 'text-emerald-600' },
  ];

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'stalled', label: 'Stalled' },
    { key: 'complete', label: 'Complete' },
  ];

  const TABLE_COLS = [
    'Official',
    'Type',
    'Progress',
    'Dues',
    'State reg.',
    'Status',
    'Last activity',
    'View',
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Header ── */}
      <header className="rounded-panel bg-slate-900 px-5 py-4 text-white shadow-soft sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              RefNet · Board
            </div>
            <div className="mt-0.5 text-xl font-semibold">DBOA Recruit Dashboard</div>
            <div className="mt-1 text-sm text-slate-400">{chapter.name}</div>
          </div>
          <span className="shrink-0 text-sm text-slate-400">Board member · read-only</span>
        </div>
      </header>

      {/* ── KPI row ── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {k.label}
            </div>
            <div className={`mt-2 text-2xl font-semibold ${k.cls}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Roster panel ── */}
      <Card className="mt-4 p-5 sm:p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          />

          <div className="flex flex-wrap gap-1.5">
            {filterChips.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filter === key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}{' '}
                <span className={filter === key ? 'opacity-60' : 'opacity-50'}>{counts[key]}</span>
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Sort:</span>
            {(['progress', 'name'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition ${
                  sort === s
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'progress' ? 'Progress' : 'Name'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {/* Indicator stripe — no header */}
                <th style={{ width: 3, padding: 0 }} />
                {TABLE_COLS.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={TABLE_COLS.length + 1}
                    className="px-4 py-8 text-center text-sm text-slate-400"
                  >
                    No recruits match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isStalled = r.status === 'stalled';
                  const barColor =
                    r.pct >= 25 ? '#2563eb' : r.pct >= 1 ? '#b45309' : '#cbd5e1';

                  return (
                    <tr
                      key={r.access_token}
                      className="border-b border-slate-100 last:border-b-0"
                      style={{ backgroundColor: isStalled ? '#fff7f8' : 'transparent' }}
                    >
                      {/* 3 px rose left-border stripe on stalled rows */}
                      <td
                        style={{
                          width: 3,
                          padding: 0,
                          backgroundColor: isStalled ? '#e11d48' : 'transparent',
                        }}
                      />

                      {/* Official */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: getAvatarColor(r.full_name) }}
                          >
                            {getInitials(r.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{r.full_name}</p>
                            <p className="truncate text-xs text-slate-400">{r.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <MemberTypePill type={r.member_type} />
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${r.pct}%`, backgroundColor: barColor }}
                            />
                          </div>
                          <span className="tabular-nums text-xs text-slate-500">
                            {r.complete_steps}/{r.total_steps}
                          </span>
                        </div>
                      </td>

                      {/* Dues */}
                      <td className="px-4 py-3">
                        <DuesPill paid={r.dues_paid} />
                      </td>

                      {/* State reg. */}
                      <td className="px-4 py-3">
                        <StateRegPill stateStatus={r.state_status} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusPill status={r.status} />
                      </td>

                      {/* Last activity */}
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {formatActivity(r.last_activity)}
                      </td>

                      {/* View */}
                      <td className="px-4 py-3">
                        <a
                          href={`/r/${r.access_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                        >
                          View →
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
