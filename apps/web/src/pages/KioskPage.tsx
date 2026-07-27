import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabase } from '../supabaseClient';

const PASSCODE = 'dboa2026';

type SessionCode = { code: string; expires_in: number };
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
    const { code, expires_in } = data as SessionCode;
    setCodeData({ code, expires_in });
    setCountdown(expires_in);

    const checkInUrl = `${window.location.origin}/checkin/${sessionId}?code=${code}&action=in`;
    try {
      const dataUrl = await QRCode.toDataURL(checkInUrl, { width: 400, margin: 2 });
      setQrDataUrl(dataUrl);
      setError(null);
    } catch {
      setError('Failed to generate QR code.');
    }
  };

  useEffect(() => {
    if (!authed || !sessionId) return;
    fetchCode();
    pollTimer.current = setInterval(fetchCode, 15000);
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
    if (
      !window.confirm(
        'Close this session? Officials who are still checked in will be flagged as left early.',
      )
    )
      return;
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
      <p className="mb-6 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        CrewCore · Attendance Kiosk
      </p>

      {error ? (
        <div className="rounded-2xl bg-rose-900/40 px-5 py-4 text-sm text-rose-300">{error}</div>
      ) : qrDataUrl ? (
        <>
          <div className="rounded-3xl bg-white p-4 shadow-2xl">
            <img src={qrDataUrl} alt="Scan to check in" width={288} height={288} className="block" />
          </div>
          <p className="mt-5 text-lg font-semibold text-white">Scan to check in</p>
          <p className="mt-1 text-sm text-slate-400">
            Code refreshes in{' '}
            <span className="font-semibold tabular-nums text-slate-200">{countdown}s</span>
          </p>
        </>
      ) : (
        <p className="text-slate-400">Loading QR…</p>
      )}

      <button
        type="button"
        onClick={handleCloseSession}
        disabled={closing}
        className="mt-12 rounded-2xl border border-rose-700/60 bg-rose-900/30 px-6 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-900/60 disabled:opacity-50"
      >
        {closing ? 'Closing…' : 'Close session'}
      </button>
    </div>
  );
}
