import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

type AttendanceStatus = {
  session_title: string;
  session_location: string | null;
  starts_at: string;
  status: 'pending' | 'checked_in' | 'attended' | 'left_early';
  check_in_at: string | null;
  check_out_at: string | null;
};

export default function CheckInPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') ?? '';

  const officialToken =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('refnet_official_token')
      : null;

  const [statusData, setStatusData] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!officialToken || !sessionId) {
      setLoading(false);
      return;
    }
    (supabase as any)
      .rpc('attendance_status', {
        p_official_token: officialToken,
        p_session_id: sessionId,
      })
      .then(({ data, error: rpcErr }: { data: AttendanceStatus | null; error: { message?: string } | null }) => {
        if (!rpcErr && data) setStatusData(data);
        setLoading(false);
      });
  }, [officialToken, sessionId]);

  const doScan = async (action: 'in' | 'out') => {
    if (!officialToken || !sessionId || !code) return;
    setBusy(true);
    setError(null);

    const { data, error: rpcErr } = await (supabase as any).rpc('attendance_scan', {
      p_official_token: officialToken,
      p_session_id: sessionId,
      p_code: code,
      p_action: action,
    });

    if (rpcErr) {
      setError(rpcErr.message ?? 'Something went wrong. Please rescan the current code.');
      setBusy(false);
      return;
    }

    const scan = data as { status: string; check_in_at: string | null; check_out_at: string | null };
    setStatusData((prev) =>
      prev
        ? {
            ...prev,
            status: scan.status as AttendanceStatus['status'],
            check_in_at: scan.check_in_at,
            check_out_at: scan.check_out_at,
          }
        : prev,
    );
    setBusy(false);
  };

  const fmtTime = (ts: string | null) =>
    ts
      ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '';

  if (!officialToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12 text-center">
        <p className="text-5xl">🔗</p>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Open your registration link first</h1>
        <p className="mt-2 max-w-xs text-sm text-slate-500">
          Check your email for the subject &ldquo;Your CrewCore registration link,&rdquo; open it, then
          scan the venue QR again.
        </p>
      </div>
    );
  }

  const errorBanner = error ? (
    <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center">
      <p className="text-sm font-semibold text-rose-700">{error}</p>
      {error.toLowerCase().includes('expired') ? (
        <p className="mt-1 text-xs text-rose-500">
          The code refreshes every 15 seconds — rescan the QR on the screen.
        </p>
      ) : null}
    </div>
  ) : null;

  const noCodeNote = !code ? (
    <p className="mt-4 text-center text-xs text-slate-400">
      No check-in code in this URL. Scan the QR code displayed at the venue.
    </p>
  ) : null;

  const header = (
    <header className="mb-8 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        CrewCore · Attendance
      </p>
      {statusData ? (
        <>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{statusData.session_title}</h1>
          {statusData.session_location ? (
            <p className="mt-0.5 text-sm text-slate-500">{statusData.session_location}</p>
          ) : null}
        </>
      ) : (
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Check-in</h1>
      )}
    </header>
  );

  const wrap = (children: React.ReactNode) => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm">
        {header}
        {children}
      </div>
    </div>
  );

  if (loading) {
    return wrap(<p className="text-center text-sm text-slate-400">Loading…</p>);
  }

  const status = statusData?.status ?? 'pending';

  if (status === 'pending') {
    return wrap(
      <>
        {errorBanner}
        <button
          type="button"
          disabled={busy || !code}
          onClick={() => doScan('in')}
          className="w-full rounded-2xl bg-slate-900 py-4 text-base font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? 'Processing…' : '🟢  Check in'}
        </button>
        {noCodeNote}
      </>,
    );
  }

  if (status === 'checked_in') {
    return wrap(
      <>
        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center">
          <p className="text-2xl">✓</p>
          <p className="mt-1 text-sm font-semibold text-blue-800">
            Checked in at {fmtTime(statusData?.check_in_at ?? null)}
          </p>
        </div>
        {errorBanner}
        <button
          type="button"
          disabled={busy || !code}
          onClick={() => doScan('out')}
          className="w-full rounded-2xl bg-slate-900 py-4 text-base font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? 'Processing…' : '🔵  Check out'}
        </button>
        {noCodeNote}
      </>,
    );
  }

  if (status === 'attended') {
    return wrap(
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
        <p className="text-4xl">✅</p>
        <p className="mt-3 text-lg font-semibold text-emerald-800">You&apos;re all set — attended</p>
        <p className="mt-1 text-sm text-emerald-700">Nothing more to do.</p>
        {statusData?.check_out_at ? (
          <p className="mt-1 text-xs text-emerald-600">
            Checked out at {fmtTime(statusData.check_out_at)}
          </p>
        ) : null}
      </div>,
    );
  }

  return wrap(
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-center">
      <p className="text-3xl">⚠️</p>
      <p className="mt-2 text-sm font-semibold text-amber-800">Marked left early</p>
      <p className="mt-1 text-xs text-amber-700">See your chapter staff for next steps.</p>
    </div>,
  );
}
