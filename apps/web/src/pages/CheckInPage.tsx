import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

type ScanResult = {
  status: string;
  check_in_at: string | null;
  check_out_at: string | null;
};

export default function CheckInPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const actionParam = searchParams.get('action') as 'in' | 'out' | null;

  const officialToken =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('refnet_official_token')
      : null;

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const doScan = async (action: 'in' | 'out') => {
    if (!officialToken || !sessionId || !code) return;
    setBusy(true);
    setError(null);
    setResult(null);

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

    setResult(data as ScanResult);
    setBusy(false);
  };

  useEffect(() => {
    if (autoRan.current) return;
    if (actionParam && officialToken && code && sessionId) {
      autoRan.current = true;
      doScan(actionParam);
    }
  }, []);

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            CrewCore · Attendance
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Check-in</h1>
        </header>

        {result ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
            <p className="text-4xl">✅</p>
            {result.check_out_at ? (
              <>
                <p className="mt-3 text-lg font-semibold text-emerald-800">Checked out</p>
                <p className="mt-1 text-sm text-emerald-700">
                  You&apos;re marked attended. See you next time!
                </p>
                <p className="mt-0.5 text-xs text-emerald-600">at {fmtTime(result.check_out_at)}</p>
              </>
            ) : (
              <>
                <p className="mt-3 text-lg font-semibold text-emerald-800">Checked in</p>
                <p className="mt-0.5 text-xs text-emerald-600">at {fmtTime(result.check_in_at)}</p>
              </>
            )}
            <button
              type="button"
              onClick={() => { setResult(null); setError(null); }}
              className="mt-5 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Scan again
            </button>
          </div>
        ) : (
          <>
            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-rose-700">{error}</p>
                {error.toLowerCase().includes('expired') ? (
                  <p className="mt-1 text-xs text-rose-500">
                    The code refreshes every 15 seconds — rescan the QR on the screen.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={busy || !code}
                onClick={() => doScan('in')}
                className="w-full rounded-2xl bg-slate-900 py-4 text-base font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {busy ? 'Processing…' : '🟢  Check in'}
              </button>
              <button
                type="button"
                disabled={busy || !code}
                onClick={() => doScan('out')}
                className="w-full rounded-2xl border border-slate-300 bg-white py-4 text-base font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {busy ? 'Processing…' : '🔵  Check out'}
              </button>
            </div>

            {!code ? (
              <p className="mt-4 text-center text-xs text-slate-400">
                No check-in code in this URL. Scan the QR code displayed at the venue.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
