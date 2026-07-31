import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabase } from '../supabaseClient';

const PASSCODE = 'dboa2026';

type SessionCode = {
  code: string;
  expires_in: number;
  session_title: string | null;
  session_location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  step_name: string | null;
};
type SessionInfo = {
  title: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  step_name: string | null;
};

// "Aug 20, 7:00 – 9:00 PM" from ISO start/end.
function formatWhen(startIso: string | null, endIso: string | null): string {
  if (!startIso) return '';
  const start = new Date(startIso);
  const datePart = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (!endIso) return `${datePart}, ${startTime}`;
  const end = new Date(endIso);
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart}, ${startTime} – ${endTime}`;
}
type CloseResult = { status: string; left_early_flagged: number };

export default function KioskPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [passcode, setPasscode] = useState('');
  const [authed, setAuthed] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);

  const [codeData, setCodeData] = useState<SessionCode | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [closing, setClosing] = useState(false);
  const [closedResult, setClosedResult] = useState<CloseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'in' | 'out'>('in');
  const [counts, setCounts] = useState<{ checked_in_total: number; checked_out: number } | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCode = async () => {
    if (!sessionId) return;
    const { data, error: rpcErr } = await (supabase as any).rpc('get_session_code', {
      p_session_id: sessionId,
      p_passcode: PASSCODE,
    });
    if (rpcErr || !data) {
      setError(rpcErr?.message ?? 'Failed to fetch session code.');
      return;
    }
    const d = data as SessionCode;
    setCodeData(d);
    setCountdown(d.expires_in);
    setSessionInfo({
      title: d.session_title,
      location: d.session_location,
      starts_at: d.starts_at,
      ends_at: d.ends_at,
      step_name: d.step_name,
    });

    const code = d.code;

    const checkInUrl = `${window.location.origin}/checkin/${sessionId}?code=${code}&action=in`;
    try {
      const dataUrl = await QRCode.toDataURL(checkInUrl, { width: 400, margin: 2 });
      setQrDataUrl(dataUrl);
      setError(null);
    } catch {
      setError('Failed to generate QR code.');
    }
  };

  const fetchCounts = async () => {
    if (!sessionId) return;
    const { data } = await (supabase as any).rpc('get_session_attendance_counts', {
      p_session_id: sessionId,
      p_passcode: PASSCODE,
    });
    if (data) setCounts(data as { checked_in_total: number; checked_out: number });
  };

  useEffect(() => {
    if (!authed || !sessionId) return;
    fetchCode();
    fetchCounts();
    pollTimer.current = setInterval(() => {
      fetchCode();
      fetchCounts();
    }, 15000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [authed, sessionId]);

  useEffect(() => {
    if (!authed || !codeData) return;
    if (tickTimer.current) clearInterval(tickTimer.current);
    tickTimer.current = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, [authed, codeData]);

  const handlePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === PASSCODE) {
      setAuthed(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const handleCloseSession = async () => {
    if (!sessionId) return;
    setClosing(true);
    const { data, error: rpcErr } = await (supabase as any).rpc('close_session', {
      p_session_id: sessionId,
      p_passcode: PASSCODE,
    });
    if (rpcErr || !data) {
      setError(rpcErr?.message ?? 'Failed to close session.');
      setClosing(false);
      return;
    }
    setClosedResult(data as CloseResult);
    setClosing(false);
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-6">
        <div className="w-full max-w-xs">
          <h1 className="mb-2 text-center text-2xl font-bold text-white">Venue Kiosk</h1>
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
            {passcodeError ? (
              <p className="text-sm text-rose-400">Incorrect passcode.</p>
            ) : null}
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

  if (closedResult) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-6 text-center">
        <p className="text-5xl">🏁</p>
        <h2 className="mt-4 text-2xl font-bold text-white">Session closed</h2>
        <p className="mt-2 text-slate-400">
          {closedResult.left_early_flagged > 0
            ? `${closedResult.left_early_flagged} official${closedResult.left_early_flagged !== 1 ? 's' : ''} flagged as left early.`
            : 'All checked-in officials were accounted for.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-6 py-10 text-center">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        CrewCore · Attendance Kiosk
      </p>

      {/* What session this kiosk is for */}
      {sessionInfo?.title ? (
        <div className="mb-5 max-w-md">
          {sessionInfo.step_name ? (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              {sessionInfo.step_name}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold text-white">{sessionInfo.title}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {formatWhen(sessionInfo.starts_at, sessionInfo.ends_at)}
            {sessionInfo.location ? ` · ${sessionInfo.location}` : ''}
          </p>
        </div>
      ) : null}

      {/* Presenter-controlled mode */}
      <div
        className="mb-6 rounded-full px-4 py-1.5 text-sm font-bold tracking-wide"
        style={{
          backgroundColor: mode === 'in' ? 'rgba(16,185,129,0.16)' : 'rgba(96,165,250,0.16)',
          color: mode === 'in' ? '#34d399' : '#60a5fa',
        }}
      >
        {mode === 'in' ? 'CHECK-IN OPEN' : 'CHECK-OUT OPEN'}
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-900/40 px-5 py-4 text-sm text-rose-300">{error}</div>
      ) : qrDataUrl ? (
        <>
          <div className="rounded-3xl bg-white p-4 shadow-2xl">
            <img src={qrDataUrl} alt="Attendance QR code" width={288} height={288} className="block" />
          </div>
          <p className="mt-5 text-lg font-semibold text-white">
            {mode === 'in' ? 'Scan to check in' : 'Scan to check out'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Code refreshes in{' '}
            <span className="font-semibold tabular-nums text-slate-200">{countdown}s</span>
          </p>
          {counts ? (
            <div
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: mode === 'in' ? '#34d399' : '#60a5fa' }}
              />
              {mode === 'in'
                ? `${counts.checked_in_total} checked in`
                : `${counts.checked_out} of ${counts.checked_in_total} checked out · ${Math.max(
                    0,
                    counts.checked_in_total - counts.checked_out,
                  )} still checked in`}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-slate-400">Loading QR…</p>
      )}

      {/* Mode toggle */}
      <button
        type="button"
        onClick={() => setMode((m) => (m === 'in' ? 'out' : 'in'))}
        className="mt-8 rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
      >
        {mode === 'in' ? 'Switch to Check-Out →' : '← Return to Check-In'}
      </button>

      {/* Close attendance (with inline confirm) */}
      {confirmClose ? (
        <div className="mt-6 w-full max-w-sm rounded-2xl border border-rose-700/60 bg-rose-950/40 px-5 py-4">
          <p className="text-sm text-rose-200">
            Close attendance for this session? Attendees will no longer be able to check in or check out.
          </p>
          <div className="mt-3 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmClose(false)}
              className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={closing}
              onClick={handleCloseSession}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
            >
              {closing ? 'Closing…' : 'Close Attendance'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmClose(true)}
          className="mt-4 rounded-2xl border border-rose-700/60 bg-rose-900/30 px-6 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-900/60"
        >
          Close Attendance
        </button>
      )}
    </div>
  );
}
