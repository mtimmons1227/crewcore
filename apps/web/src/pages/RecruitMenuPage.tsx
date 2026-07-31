import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui';
import { registerDomainEventHandler } from '../lib/domainEvents';

// ── Types ─────────────────────────────────────────────────────────────────────

type PricingEntry = {
  amount: number;
  member_type: string;
  until?: string;
  from?: string;
  requires_documentation?: string;
};

type StepConfig = {
  note?: string;
  pricing?: PricingEntry[];
  external_url?: string;
  external_system?: string;
  nonrefundable?: boolean;
  required_by?: string;
  required_for?: string[];
  materials?: string[];
  dates?: string[];
  fee?: number;
  signup_url?: string;
  registration_deadline?: string;
  formats?: string[];
  count_required?: number;
  location?: string;
  distributed_by?: string;
  thresholds?: { playoffs: number; regular_season: number };
  first_game_required?: boolean;
  [key: string]: unknown;
};

type RegistrationStep = {
  step_id: string;
  name: string;
  description: string | null;
  status: 'locked' | 'available' | 'complete';
  completion_mode: 'self_report' | 'staff_verify';
  step_type: string;
  cadence: string;
  required: boolean;
  sort_order: number;
  completed_at: string | null;
  completed_via?: string | null;
  due_at?: string | null;
  evidence_url: string | null;
  data: Record<string, unknown>;
  config: StepConfig | null;
  authority: 'state' | 'chapter';
  prerequisite_step_id: string | null;
};

type RegistrationResponse = {
  cycle: {
    status: string;
    member_type: string | null;
    clearance_level: 'none' | 'regular' | 'playoff' | string | null;
    cleared_at: string | null;
    chapter: string;
    season: string;
    sport: string;
    placement_confirmed: boolean;
    welcome_video_watched_at: string | null;
    person: { email: string | null; full_name: string | null };
  };
  steps: RegistrationStep[];
};

type FeeRow = {
  step: RegistrationStep;
  amount: number;
  channel: 'refnet' | 'arbiter' | 'dboa';
  pill: 'paid' | 'unpaid' | 'awaiting' | 'not_started';
};

type RenderItem =
  | { kind: 'step'; step: RegistrationStep; idx: number }
  | { kind: 'milestone'; prevComplete: boolean };

type StepSession = {
  session_id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  my_status: 'pending' | 'checked_in' | 'attended' | 'left_early';
  check_in_at: string | null;
  check_out_at: string | null;
};

// ── Description helpers ───────────────────────────────────────────────────────

// Hardcoded President welcome videos — one Synthesia render per path.
// Rendered manually in Synthesia Studio (free plan has no API), so nothing here
// depends on a paid key. To change a path's video, paste a new share/embed URL
// below — no other code change is needed. All three point at the New-official
// render until the Returning and Transfer versions are recorded.
const WELCOME_VIDEOS: Record<string, string> = {
  new: 'https://share.synthesia.io/embeds/videos/ae42567e-9aa5-4bf1-bc30-4e192c3ca77e',
  returning: 'https://share.synthesia.io/embeds/videos/ae42567e-9aa5-4bf1-bc30-4e192c3ca77e',
  transfer: 'https://share.synthesia.io/embeds/videos/ae42567e-9aa5-4bf1-bc30-4e192c3ca77e',
};
const DEFAULT_WELCOME_VIDEO = WELCOME_VIDEOS.new;
function welcomeVideoFor(memberType: string | null | undefined): string {
  return WELCOME_VIDEOS[memberType ?? 'new'] ?? DEFAULT_WELCOME_VIDEO;
}

// Written status label for each step, so a symbol never stands alone.
function stepStatusLabel(step: RegistrationStep): { text: string; cls: string } {
  if (step.status === 'complete') {
    return step.completed_via === 'simulation'
      ? { text: 'Test simulated', cls: 'bg-amber-50 text-amber-700' }
      : { text: 'Completed', cls: 'bg-emerald-50 text-emerald-700' };
  }
  if (step.status === 'locked') return { text: 'Waiting on a prior step', cls: 'bg-slate-100 text-slate-500' };
  if (step.step_type === 'payment') return { text: 'Payment needed', cls: 'bg-blue-50 text-blue-700' };
  if (step.step_type === 'attendance') return { text: 'Attendance pending', cls: 'bg-blue-50 text-blue-700' };
  if (step.completion_mode === 'self_report') return { text: 'Action available', cls: 'bg-blue-50 text-blue-700' };
  if (step.authority === 'state') return { text: 'Awaiting state confirmation', cls: 'bg-amber-50 text-amber-700' };
  return { text: 'Awaiting confirmation', cls: 'bg-amber-50 text-amber-700' };
}

function getStepDescription(step: RegistrationStep): string | null {
  const c = step.config;
  if (!c) return null;

  if (step.step_type === 'assessment') {
    const t = c.thresholds;
    if (t) return `Score ${t.regular_season}+ for regular season · ${t.playoffs}+ for playoffs`;
  }
  if (step.step_type === 'attendance') {
    const parts: string[] = [];
    if (Array.isArray(c.dates) && c.dates.length) {
      const fmt = (d: string) =>
        new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      parts.push(
        c.dates.length > 1
          ? `${fmt(c.dates[0])} – ${fmt(c.dates[c.dates.length - 1])}`
          : fmt(c.dates[0]),
      );
    }
    if (c.fee != null) parts.push(`$${c.fee} fee`);
    if (c.location) parts.push(c.location);
    if (parts.length) return parts.join(' · ');
  }
  if (c.note) return c.note;
  if (c.distributed_by) return `Distributed by your ${c.distributed_by}`;
  if (Array.isArray(c.materials) && c.materials.length) return (c.materials as string[]).join(' & ');
  if (c.count_required) return `${c.count_required} meetings required this season`;
  if (c.external_url) {
    try {
      return `Complete at ${new URL(c.external_url).hostname}`;
    } catch {
      return null;
    }
  }
  return null;
}

function getCostText(step: RegistrationStep): string | null {
  const c = step.config;
  if (!c) return null;
  if (Array.isArray(c.pricing)) {
    const entry = c.pricing.find((p) => p.member_type === 'new') ?? c.pricing[0];
    if (entry?.amount) return `$${entry.amount}`;
  }
  if (c.fee != null) return `$${c.fee}`;
  return null;
}

// Pricing takes precedence over fee — the dues step has a temporary fee:45
// test override but its real price lives in config.pricing.
function getStepFeeAmount(step: RegistrationStep, memberType: string | null): number | null {
  const c = step.config;
  if (!c) return null;
  if (Array.isArray(c.pricing) && c.pricing.length > 0) {
    const entry = c.pricing.find((p) => p.member_type === (memberType ?? 'new')) ?? c.pricing[0];
    return entry?.amount != null ? Number(entry.amount) : null;
  }
  if (c.fee != null) return Number(c.fee);
  return null;
}

function formatAudience(required_for: string[]): string {
  const map: Record<string, string> = {
    new: 'New officials',
    second_year: '2nd-year',
    returning: 'Returning',
    transfer: 'Transfer',
    IV: 'Div IV',
    V: 'Div V',
  };
  return required_for.map((v) => map[v] ?? v).join(' · ');
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8l3.5 3.5L13 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="3.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClipboardCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 2.5V4a.5.5 0 00.5.5h4a.5.5 0 00.5-.5V2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5 8.5l1.5 1.5L11 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5l5.5 2.25v4c0 3.5-5.5 6.75-5.5 6.75S2.5 11.25 2.5 7.75v-4L8 1.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 3.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 10.5c1.65.5 2.75 1.9 3 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GraduationCapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.5l7 3.5-7 3.5-7-3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M3 7.5v4c0 1.38 2.24 2.5 5 2.5s5-1.12 5-2.5v-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M15 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 2h7a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V4a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M5 5.5h5M5 8h5M5 10.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ShirtIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1 4.5L4 2h8l3 2.5-2.5 2V14H5.5V6.5L1 4.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 2.5C5.5 3.9 6.6 5 8 5s2.5-1.1 2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11 2l3 3-8.5 8.5L2 14l.5-3.5L11 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9.5 3.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepTypeIcon({ stepType, stepName }: { stepType: string; stepName: string }) {
  const lname = stepName.toLowerCase();
  switch (stepType) {
    case 'payment':
      return lname.includes('uniform') ? <ShirtIcon /> : <CreditCardIcon />;
    case 'external_confirm':
      return <ClipboardCheckIcon />;
    case 'credential':
      return <ShieldIcon />;
    case 'attendance':
      return lname.includes('training') || lname.includes('camp')
        ? <GraduationCapIcon />
        : <UsersIcon />;
    case 'assessment':
      return <PencilIcon />;
    case 'acknowledgment':
      return <BookIcon />;
    default:
      return <ClipboardCheckIcon />;
  }
}

function NodeCircle({ state, number }: { state: 'complete' | 'current' | 'locked'; number: number }) {
  if (state === 'complete') {
    return (
      <div
        style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          backgroundColor: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (state === 'current') {
    return (
      <div
        style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          backgroundColor: 'white', border: '2.5px solid #2563eb',
          boxShadow: '0 0 0 4px rgba(37,99,235,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#2563eb' }} />
      </div>
    );
  }
  return (
    <div
      style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        backgroundColor: 'white', border: '2px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', lineHeight: 1 }}>{number}</span>
    </div>
  );
}

// ── Session status pill ───────────────────────────────────────────────────────

function SessionStatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    pending:    { label: 'Pending',    cls: 'bg-slate-100 text-slate-500' },
    checked_in: { label: 'Checked in', cls: 'bg-blue-50 text-blue-700' },
    attended:   { label: 'Attended',   cls: 'bg-emerald-50 text-emerald-700' },
    left_early: { label: 'Left early', cls: 'bg-amber-50 text-amber-700' },
  };
  const { label, cls } = cfg[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ── Save-link modal ───────────────────────────────────────────────────────────

function SaveLinkModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — input onFocus selects as fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ backgroundColor: 'rgba(15,23,42,0.6)' }}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
        <h2 className="text-lg font-semibold text-slate-900">Save your way back in</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Your personal registration link is in your email — subject{' '}
          <span className="font-semibold">
            &ldquo;Your CrewCore registration link — save this email.&rdquo;
          </span>{' '}
          Keep that email, or bookmark this page, and you can return to your checklist anytime.
        </p>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Your link
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={pageUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>

        {/* Prominent bookmark instruction */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">How to get back to your registration</p>

          {/* Desktop */}
          <ul className="mt-2 hidden list-none space-y-1.5 text-sm text-slate-700 sm:block">
            <li className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span>1. Press</span>
              {/Mac/i.test(navigator.platform ?? '') ? (
                <>
                  <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">⌘</kbd>
                  <span>+</span>
                  <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">D</kbd>
                </>
              ) : (
                <>
                  <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">D</kbd>
                </>
              )}
              <span>to bookmark this page, or</span>
            </li>
            <li>
              2. Keep the email we sent you — subject{' '}
              <span className="font-semibold">&ldquo;Your CrewCore registration link — save this email.&rdquo;</span>
            </li>
          </ul>

          {/* Mobile */}
          <ul className="mt-2 list-none space-y-1.5 text-sm text-slate-700 sm:hidden">
            <li>1. Tap your browser&apos;s Share button → Add to Home Screen, or</li>
            <li>
              2. Keep the email we sent you — subject{' '}
              <span className="font-semibold">&ldquo;Your CrewCore registration link — save this email.&rdquo;</span>
            </li>
          </ul>

          <p className="mt-2.5 text-sm font-semibold text-slate-900">
            Use it every time you need to get back into your registration.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ── Shared class constants ────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400';
const primaryBtn =
  'w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70';

const PER_GAME_FEE = 50;

// ── Merge authority data ───────────────────────────────────────────────────────

async function mergeAuthorityData(
  raw: RegistrationResponse,
): Promise<{ steps: RegistrationStep[]; chapterLogoUrl: string | null }> {
  const stepIds = raw.steps.map((s) => s.step_id);
  const chapterSlug = raw.cycle.chapter.split(/\s[-–—]\s/)[0]?.trim() ?? 'DBOA';

  const [wsResult, chapterResult] = await Promise.all([
    supabase
      .from('workflow_step')
      .select('id, authority, prerequisite_step_id')
      .in('id', stepIds),
    supabase.from('chapter').select('logo_url').eq('slug', chapterSlug).single(),
  ]);

  const wsMap: Record<string, { authority: 'state' | 'chapter'; prerequisite_step_id: string | null }> = {};
  for (const ws of wsResult.data ?? []) {
    wsMap[ws.id] = {
      authority: (ws.authority as 'state' | 'chapter') ?? 'chapter',
      prerequisite_step_id: ws.prerequisite_step_id ?? null,
    };
  }

  const steps: RegistrationStep[] = raw.steps.map((s) => ({
    ...s,
    authority: wsMap[s.step_id]?.authority ?? 'chapter',
    prerequisite_step_id: wsMap[s.step_id]?.prerequisite_step_id ?? null,
  }));

  return {
    steps,
    chapterLogoUrl: (chapterResult.data as { logo_url: string | null } | null)?.logo_url ?? null,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecruitMenuPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const locState = location.state as { emailSent?: boolean; justSubmitted?: boolean } | null;
  const emailSent = locState?.emailSent === true;
  const [registration, setRegistration] = useState<RegistrationResponse | null>(null);
  const [chapterLogo, setChapterLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const [assessmentScores, setAssessmentScores] = useState<Record<string, string>>({});
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [feesOpen, setFeesOpen] = useState(false);
  const [showModal, setShowModal] = useState(Boolean(locState?.justSubmitted));
  const [expandedAttendance, setExpandedAttendance] = useState<Record<string, boolean>>({});
  const [stepSessions, setStepSessions] = useState<Record<string, StepSession[]>>({});
  const [stepSessionsLoading, setStepSessionsLoading] = useState<Record<string, boolean>>({});
  const [demoLoading, setDemoLoading] = useState(false);
  const [videoCollapsed, setVideoCollapsed] = useState(false);
  const [confirmSim, setConfirmSim] = useState(false);
  const [confirmStep, setConfirmStep] = useState<string | null>(null);
  const [welcomeVideoSrc, setWelcomeVideoSrc] = useState(DEFAULT_WELCOME_VIDEO);
  const paymentSuccess = searchParams.get('payment') === 'success';

  useEffect(() => {
    if (token) localStorage.setItem('refnet_official_token', token);
  }, [token]);

  useEffect(() => {
    registerDomainEventHandler('dues.paid', () => {
      window.location.reload();
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    const fetchRegistration = async () => {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_registration', { p_token: token });
      if (rpcError || !data) {
        setError('Unable to load your registration. Please check the link or try again.');
        setLoading(false);
        return;
      }

      const raw = data as RegistrationResponse;
      const { steps, chapterLogoUrl } = await mergeAuthorityData(raw);

      setChapterLogo(chapterLogoUrl);
      setRegistration({ cycle: raw.cycle, steps });
      setLoading(false);
    };

    fetchRegistration();
  }, [token]);

  // Welcome video: collapse by default once the recruit has seen it (state stored
  // per recruit in the DB, so it behaves the same on any device). On the first
  // view, record it so return visits — anywhere — open collapsed.
  useEffect(() => {
    const watchedAt = registration?.cycle.welcome_video_watched_at ?? null;
    if (watchedAt) {
      setVideoCollapsed(true);
    } else if (registration && token) {
      (supabase as any).rpc('set_welcome_video_watched', { p_token: token });
    }
  }, [registration, token]);

  // Pick the President welcome video for this recruit's path. Hardcoded per path
  // (see WELCOME_VIDEOS above) for the demo — no API call, so nothing breaks on the
  // Synthesia free plan. Swap a URL in that map to change any path's video.
  useEffect(() => {
    setWelcomeVideoSrc(welcomeVideoFor(registration?.cycle.member_type ?? null));
  }, [registration]);

  const handleCompleteStep = async (stepId: string, score?: number) => {
    if (!token) return;
    setBusyStep(stepId);
    setError(null);
    setStepErrors((prev) => ({ ...prev, [stepId]: '' }));

    const pData = score !== undefined ? { score } : {};
    const { error: rpcError } = await supabase.rpc('complete_step', {
      p_token: token,
      p_step_id: stepId,
      p_data: pData,
    });

    if (rpcError) {
      setError('Unable to complete this step. Please try again.');
      setBusyStep(null);
      return;
    }

    const { data, error: refreshError } = await supabase.rpc('get_registration', { p_token: token });
    if (refreshError || !data) {
      setError('Unable to refresh registration after completing the step.');
      setBusyStep(null);
      return;
    }

    const raw = data as RegistrationResponse;
    const { steps } = await mergeAuthorityData(raw);
    setRegistration({ cycle: raw.cycle, steps });
    setBusyStep(null);
    setConfirmStep(null);
  };

  const handleUncompleteStep = async (stepId: string) => {
    if (!token) return;
    setBusyStep(stepId);
    setError(null);
    const { data, error: rpcError } = await (supabase as any).rpc('uncomplete_step', {
      p_token: token,
      p_step_id: stepId,
    });
    if (rpcError || !data) {
      setError('Unable to reopen this step. Please try again.');
      setBusyStep(null);
      return;
    }
    const raw = data as RegistrationResponse;
    const { steps } = await mergeAuthorityData(raw);
    setRegistration({ cycle: raw.cycle, steps });
    setBusyStep(null);
  };

  const toggleAttendanceSessions = async (stepId: string) => {
    const opening = !expandedAttendance[stepId];
    setExpandedAttendance((prev) => ({ ...prev, [stepId]: opening }));
    if (opening && !stepSessions[stepId]) {
      setStepSessionsLoading((prev) => ({ ...prev, [stepId]: true }));
      const { data } = await (supabase as any).rpc('get_step_sessions', {
        p_official_token: token,
        p_workflow_step_id: stepId,
      });
      setStepSessions((prev) => ({ ...prev, [stepId]: (data as StepSession[]) ?? [] }));
      setStepSessionsLoading((prev) => ({ ...prev, [stepId]: false }));
    }
  };

  const handlePayDues = async (stepId: string) => {
    if (!token) return;
    setPaymentLoading(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke('create-dues-checkout', {
      body: { token, step_id: stepId },
    });
    if (fnError || !data?.url) {
      setError('Unable to start payment. Please try again.');
      setPaymentLoading(false);
      return;
    }
    window.location.href = data.url as string;
  };

  const renderStepAction = (step: RegistrationStep) => {
    const scoreValue = assessmentScores[step.step_id] ?? '';
    const isAssessment = step.step_type === 'assessment';

    if (step.step_type === 'payment' && step.status === 'available') {
      const costText = getCostText(step);
      return (
        <button
          type="button"
          disabled={paymentLoading}
          onClick={() => handlePayDues(step.step_id)}
          className={`mt-1 ${primaryBtn}`}
        >
          {paymentLoading ? 'Redirecting to payment…' : `Pay${costText ? ` ${costText}` : ''}`}
        </button>
      );
    }
    const score = parseInt(scoreValue, 10);

    if (step.status === 'available' && step.completion_mode === 'self_report') {
      if (isAssessment) {
        const invalidScore = Number.isNaN(score) || score < 0 || score > 100;
        return (
          <div className="flex flex-col gap-3 pt-1">
            <label className="block text-sm font-semibold text-slate-700">
              <span className="mb-2 block">Assessment score</span>
              <input
                type="number"
                min="0"
                max="100"
                value={scoreValue}
                onChange={(e) =>
                  setAssessmentScores((prev) => ({ ...prev, [step.step_id]: e.target.value }))
                }
                placeholder="Enter score (0–100)"
                className={inputCls}
              />
            </label>
            {stepErrors[step.step_id] ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {stepErrors[step.step_id]}
              </p>
            ) : null}
            <button
              type="button"
              disabled={busyStep === step.step_id || invalidScore || score < 70}
              onClick={() => {
                if (invalidScore || score < 70) {
                  setStepErrors((prev) => ({
                    ...prev,
                    [step.step_id]: 'Enter a valid score of 70 or higher to complete this assessment.',
                  }));
                  return;
                }
                handleCompleteStep(step.step_id, score);
              }}
              className={primaryBtn}
            >
              {busyStep === step.step_id ? 'Submitting…' : 'Submit score'}
            </button>
          </div>
        );
      }

      const isUniform = /uniform/i.test(step.name);
      const markLabel = isUniform ? 'Mark Uniform as Obtained' : 'Mark done';
      if (confirmStep === step.step_id) {
        return (
          <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-700">
              {isUniform
                ? 'Have you obtained the required DBOA uniform?'
                : `Mark "${step.name}" as done?`}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmStep(null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyStep === step.step_id}
                onClick={() => handleCompleteStep(step.step_id)}
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {busyStep === step.step_id ? 'Saving…' : 'Yes, mark complete'}
              </button>
            </div>
          </div>
        );
      }
      return (
        <button
          type="button"
          onClick={() => setConfirmStep(step.step_id)}
          disabled={busyStep === step.step_id}
          className={`mt-1 ${primaryBtn}`}
        >
          {markLabel}
        </button>
      );
    }

    if (step.status === 'available' && step.completion_mode === 'staff_verify') {
      return (
        <p className="mt-1 text-sm text-slate-500">
          Your chapter staff will confirm this step when it&apos;s complete.
        </p>
      );
    }

    if (step.status === 'complete' && step.completion_mode === 'self_report') {
      return (
        <button
          type="button"
          disabled={busyStep === step.step_id}
          onClick={() => handleUncompleteStep(step.step_id)}
          className="mt-1 bg-transparent p-0 text-xs font-semibold text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline disabled:opacity-60"
        >
          {busyStep === step.step_id ? 'Reopening…' : 'Mark as not complete'}
        </button>
      );
    }

    return null;
  };

  // ── Loading / error shells ────────────────────────────────────────────────

  const shellHeader = (
    <header className="rounded-panel bg-slate-900 px-5 py-4 text-white shadow-soft sm:px-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          CrewCore Pathway
        </div>
        <div className="mt-0.5 text-xl font-semibold">Your path to officiating</div>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div>
        {shellHeader}
        <Card className="mt-6 p-6">
          <p className="text-sm text-slate-500">Loading your registration…</p>
        </Card>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div>
        {shellHeader}
        <Card className="mt-6 p-6">
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error ?? 'Unable to load registration. Please check your link.'}
          </p>
        </Card>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const { cycle, steps } = registration;
  // Default true so existing sessions (pre-migration-025) aren't accidentally locked
  const placementConfirmed = cycle.placement_confirmed ?? true;
  const sortedSteps = steps.slice().sort((a, b) => a.sort_order - b.sort_order);

  const hasUnfinishedStateSteps = sortedSteps.some(
    (s) => s.authority === 'state' && s.status !== 'complete',
  );

  async function handleDemoThsboa() {
    if (!token) return;
    setDemoLoading(true);
    try {
      await (supabase as any).rpc('demo_load_thsboa', { p_token: token });
      window.location.reload();
    } catch {
      setDemoLoading(false);
    }
  }
  const completedCount = sortedSteps.filter((s) => s.status === 'complete').length;
  const progressPct = sortedSteps.length > 0 ? Math.round((completedCount / sortedSteps.length) * 100) : 0;
  const isStalled = sortedSteps.some(
    (s) => s.due_at && s.status !== 'complete' && new Date(s.due_at).getTime() < Date.now(),
  );
  const firstName = cycle.person.full_name?.split(' ')[0] ?? cycle.person.email ?? 'there';

  const chapterParts = cycle.chapter.split(/\s[-–—]\s/);
  const fullChapterName = chapterParts.length > 1 ? chapterParts.slice(1).join(' — ') : cycle.chapter;

  const pathHeadline =
    cycle.member_type === 'returning'
      ? "Welcome back — let's get you renewed for the season."
      : cycle.member_type === 'transfer'
        ? 'Welcome to DBOA.'
        : cycle.person.full_name
          ? `${cycle.person.full_name.split(' ')[0]}'s path to officiating`
          : 'Your path to officiating';
  const pathSub =
    cycle.member_type === 'transfer'
      ? "We've recognized what you already hold — here's what's left to join us locally."
      : null;

  const feeRows: FeeRow[] = sortedSteps
    .filter((step) => {
      const c = step.config;
      return c != null && ((Array.isArray(c.pricing) && c.pricing.length > 0) || c.fee != null);
    })
    .map((step) => {
      const amount = getStepFeeAmount(step, cycle.member_type) ?? 0;
      const channel: FeeRow['channel'] =
        step.step_type === 'payment'
          ? 'refnet'
          : step.authority === 'state' || !!step.config?.external_url
            ? 'arbiter'
            : 'dboa';
      const pill: FeeRow['pill'] =
        step.status === 'complete'
          ? 'paid'
          : channel === 'refnet'
            ? 'unpaid'
            : channel === 'arbiter'
              ? 'awaiting'
              : 'not_started';
      return { step, amount, channel, pill };
    });

  const paidFeeCount = feeRows.filter((r) => r.pill === 'paid').length;
  const totalFees = feeRows.reduce((sum, r) => sum + r.amount, 0);
  const paidAmount = feeRows.filter((r) => r.pill === 'paid').reduce((sum, r) => sum + r.amount, 0);
  const remainingFees = totalFees - paidAmount;
  const earnBackGames = totalFees > 0 ? Math.round(totalFees / PER_GAME_FEE) : 0;

  const stepsToFirstGame = sortedSteps.filter(
    (s) => s.config?.first_game_required === true && s.status !== 'complete',
  ).length;

  // First-game readiness vs full-season, for the sidebar progress panel.
  const firstGameSteps = sortedSteps.filter((s) => s.config?.first_game_required === true);
  const firstGameTotal = firstGameSteps.length;
  const firstGameDone = firstGameSteps.filter((s) => s.status === 'complete').length;
  const firstGamePct = firstGameTotal > 0 ? Math.round((firstGameDone / firstGameTotal) * 100) : 0;

  // Test/staging only: gates simulation controls and shows a test-environment banner.
  const testMode =
    new URLSearchParams(window.location.search).has('demo') ||
    /localhost|127\.0\.0\.1/.test(window.location.hostname);

  const lastFirstGameIdx = sortedSteps.reduce(
    (last, s, i) => (s.config?.first_game_required === true ? i : last),
    -1,
  );

  const clearancePill =
    cycle.clearance_level === 'playoff'
      ? { label: 'Playoff cleared', cls: 'bg-emerald-50 text-emerald-700' }
      : cycle.clearance_level === 'regular'
        ? { label: 'Regular season cleared', cls: 'bg-emerald-50 text-emerald-700' }
        : null;

  const isCleared = cycle.clearance_level != null && cycle.clearance_level !== 'none';

  const headline =
    lastFirstGameIdx === -1
      ? isCleared
        ? "You're cleared to work games!"
        : `${completedCount} of ${sortedSteps.length} steps complete`
      : stepsToFirstGame === 0
        ? "You've unlocked your first paid game! 🏁"
        : `You're ${stepsToFirstGame} step${stepsToFirstGame !== 1 ? 's' : ''} from your first paid game 🏁`;

  // Build render items: steps interspersed with an optional milestone marker
  const renderItems: RenderItem[] = [];
  sortedSteps.forEach((step, idx) => {
    renderItems.push({ kind: 'step', step, idx });
    if (lastFirstGameIdx !== -1 && idx === lastFirstGameIdx) {
      renderItems.push({ kind: 'milestone', prevComplete: step.status === 'complete' });
    }
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Save-link modal (every visit) ── */}
      {showModal ? <SaveLinkModal onClose={() => setShowModal(false)} /> : null}

      {/* ── Header ── */}
      <header className="rounded-panel bg-slate-900 px-5 py-4 text-white shadow-soft sm:px-6">
        <div className="flex items-center gap-3">
          {chapterLogo ? (
            <img
              src={chapterLogo}
              alt=""
              className="h-11 w-auto shrink-0 rounded-lg object-contain"
            />
          ) : null}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              CrewCore Pathway
            </div>
            <div className="text-xl font-semibold leading-snug">{pathHeadline}</div>
            {pathSub ? (
              <div className="mt-0.5 text-sm text-slate-300">{pathSub}</div>
            ) : null}
            <div className="mt-1 text-sm text-slate-400">
              {fullChapterName} · {cycle.season}
            </div>
          </div>
        </div>
      </header>

      {/* ── Test-environment banner ── */}
      {testMode ? (
        <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-center text-xs font-semibold text-rose-700">
          TEST ENVIRONMENT — actions on this page do not represent real credentials or payments.
        </div>
      ) : null}

      {/* ── Welcome video (collapsible; watched state persists per recruit across devices) ── */}
      {videoCollapsed ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Welcome — a message for you
            </div>
            <div className="text-sm font-semibold text-slate-900">
              A welcome from DBOA President Harold C. Young, II
              {cycle.welcome_video_watched_at ? (
                <span className="ml-1 font-normal text-slate-400">
                  · watched {new Date(cycle.welcome_video_watched_at).toLocaleDateString()}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVideoCollapsed(false)}
            className="shrink-0 rounded-xl bg-transparent px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Watch again ▾
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 px-4 pt-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Welcome — a message for you
              </div>
              <div className="mt-0.5 text-base font-semibold text-slate-900">
                A welcome from DBOA President Harold C. Young, II
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVideoCollapsed(true)}
              aria-label="Collapse welcome video"
              className="shrink-0 rounded-xl bg-transparent px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Collapse ▴
            </button>
          </div>
          <div className="px-4 pb-4 pt-3">
            <div
              className="relative overflow-hidden rounded-xl bg-slate-900"
              style={{ aspectRatio: '16 / 9' }}
            >
              <iframe
                src={welcomeVideoSrc}
                title="Welcome to DBOA"
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
                loading="lazy"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Payment success banner ── */}
      {paymentSuccess ? (
        <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
          Payment confirmed — your dues step has been marked complete.
        </div>
      ) : null}

      {/* ── Email-sent banner (shown once on first navigation from intake) ── */}
      {emailSent ? (
        <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
          We also emailed your registration link — use it to come back anytime.
        </div>
      ) : null}

      {/* ── Persistent link reminder (always visible) ── */}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
        <span aria-hidden="true">🔖</span>
        This page is your saved progress — bookmark it, or use the link we emailed you to get back here.
      </p>

      {/* ── State simulation (staff test tool — test mode only) ── */}
      {hasUnfinishedStateSteps && testMode ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
              Test only
            </span>
            <p className="text-sm text-amber-800">
              Simulate THSBOA state steps (registration, background check, state test) completing.
            </p>
          </div>
          {confirmSim ? (
            <div className="mt-3 rounded-xl border border-amber-300 bg-white px-4 py-3">
              <p className="text-xs leading-relaxed text-slate-600">
                This test action will mark state registration, background requirements, and the state
                test as complete. No real state records will be changed.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSim(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDemoThsboa}
                  disabled={demoLoading}
                  className="rounded-xl bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
                >
                  {demoLoading ? 'Running…' : 'Run State Simulation'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmSim(true)}
              className="mt-3 rounded-xl bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800"
            >
              Simulate State Completion
            </button>
          )}
        </div>
      ) : null}

      {/* ── Next action (full width) ── */}
      {placementConfirmed ? (
        <Card className="mt-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Chapter fit
              </p>
              <h3 className="mt-0.5 text-base font-semibold text-slate-900">
                {cycle.chapter} is your first correct call.
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                You’re matched with {cycle.chapter} — move forward with confidence. The
                checklist below is built for your chapter.
              </p>
            </div>
            <span className="text-2xl" aria-hidden="true">✅</span>
          </div>
        </Card>
      ) : (
        <Card className="mt-4 p-5 ring-2 ring-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Your first step
              </p>
              <h3 className="mt-0.5 text-base font-semibold text-slate-900">
                First, find your chapter.
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose the chapter that fits where you live and work. Your path unlocks once you do.
              </p>
            </div>
            <span className="text-2xl" aria-hidden="true">📍</span>
          </div>
          <Link
            to={`/r/${token}/make-the-call`}
            className="mt-4 block rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Find my best chapter
          </Link>
        </Card>
      )}

      {/* ── Two-column dashboard (main journey + sticky summary) ── */}
      <div className="mt-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
        <aside className="lg:col-span-1 lg:order-2 lg:sticky lg:top-6">
          {/* ── Progress summary ── */}
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {firstName}&apos;s progress
            </p>
            <h2 className="mt-1 text-base font-semibold leading-snug text-slate-900">{headline}</h2>
            {clearancePill || isStalled ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {clearancePill ? (
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${clearancePill.cls}`}>
                    {clearancePill.label}
                  </span>
                ) : null}
                {isStalled ? (
                  <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    Stalled
                  </span>
                ) : null}
              </div>
            ) : null}

            {firstGameTotal > 0 ? (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>First-game readiness</span>
                  <span className="tabular-nums">{firstGameDone} of {firstGameTotal}</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${firstGamePct}%` }} />
                </div>
              </div>
            ) : null}

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Full-season requirements</span>
                <span className="tabular-nums">{completedCount} of {sortedSteps.length}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-slate-900" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{completedCount}</span> done ·{' '}
              <span className="font-semibold text-slate-900">{sortedSteps.length - completedCount}</span> left ·{' '}
              <span className="font-semibold text-slate-900">{progressPct}%</span>
            </div>
          </Card>

          {/* ── 2. Fees strip (compact, collapsible) ── */}
      {feeRows.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setFeesOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 bg-transparent px-4 py-3.5 text-left"
            aria-expanded={feesOpen}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                First-year fees ${totalFees}
                {remainingFees > 0 ? ` · $${remainingFees} left` : ' · fully paid'}
              </p>
              {earnBackGames > 0 ? (
                <p
                  className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}
                >
                  About 4–5 middle-school games covers your first-year fees — then every whistle is profit.
                </p>
              ) : null}
            </div>
            <span className="text-slate-400">
              <ChevronDownIcon open={feesOpen} />
            </span>
          </button>

          {feesOpen ? (
            <div className="border-t border-slate-100 px-4 pb-5 pt-3">
              {/* Column headers */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 border-b border-slate-200 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Item</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Amount</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span>
              </div>

              {/* Fee rows */}
              {feeRows.map(({ step, amount, channel, pill }) => {
                const isChapter = step.authority === 'chapter';
                const tileCls =
                  step.status === 'complete'
                    ? 'bg-slate-900 text-white'
                    : step.status === 'available'
                      ? isChapter
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-blue-50 text-blue-600'
                      : 'bg-slate-100 text-slate-300';
                const channelDotCls = channel === 'arbiter' ? 'bg-blue-500' : 'bg-emerald-500';
                const channelText =
                  channel === 'refnet'
                    ? 'Paid here in RefNet · card'
                    : channel === 'arbiter'
                      ? 'Paid on ArbiterSports · confirmed automatically'
                      : 'Paid to DBOA';
                const pillStyle =
                  pill === 'paid'
                    ? { bg: '#dcfce7', color: '#16a34a', label: 'Paid' }
                    : pill === 'unpaid'
                      ? { bg: '#ffe4e6', color: '#e11d48', label: 'Not paid' }
                      : pill === 'awaiting'
                        ? { bg: '#fef3c7', color: '#b45309', label: 'Verifying' }
                        : { bg: '#f1f5f9', color: '#64748b', label: 'Upcoming' };

                return (
                  <div
                    key={step.step_id}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 border-b border-slate-100 py-3 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tileCls}`}>
                        {step.status === 'complete' ? (
                          <CheckIcon />
                        ) : (
                          <StepTypeIcon stepType={step.step_type} stepName={step.name} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{step.name}</p>
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${channelDotCls}`} />
                          {channelText}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">${amount}</span>
                    <span
                      className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: pillStyle.bg, color: pillStyle.color }}
                    >
                      {pillStyle.label}
                    </span>
                  </div>
                );
              })}

              {/* Total row */}
              <div className="mt-2 border-t border-slate-200 pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">First-year total</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {paidFeeCount} paid {paidFeeCount === 1 ? 'item' : 'items'} · other steps have
                      no fee
                    </p>
                  </div>
                  <p className="shrink-0 text-xl font-bold text-slate-900">${totalFees}</p>
                </div>
              </div>

              {/* How-it-works note */}
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs leading-relaxed text-slate-500">
                  <span className="font-semibold text-slate-700">How this works:</span>{' '}
                  Only the chapter dues are paid inside RefNet by card. State dues are paid on
                  ArbiterSports and confirmed here automatically once your state eligibility clears.
                  The training camp fee is collected by DBOA. The remaining steps carry no fee.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

          {/* ── Need help? ── */}
          <Card className="mt-4 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Need help?</p>
            <p className="mt-1 text-sm text-slate-500">
              Questions about registration, fees, or your checklist?
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href="https://thedboa.com"
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Visit the DBOA Website
              </a>
              {!placementConfirmed ? (
                <Link
                  to={`/r/${token}/make-the-call`}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Help me choose my chapter
                </Link>
              ) : null}
            </div>
          </Card>
        </aside>

        {/* ── Main journey column ── */}
        <div className="mt-4 lg:col-span-2 lg:order-1 lg:mt-0">
          {/* ── 4. Vertical meter ── */}
      {sortedSteps.length > 0 ? (
        <Card className="mt-4 p-5 sm:p-6">
          {/* ── Status legend ── */}
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 pb-3 text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1"><span className="font-bold text-emerald-600">✓</span> Completed</span>
            <span className="flex items-center gap-1"><span className="font-bold text-blue-500">◉</span> Action available now</span>
            <span className="flex items-center gap-1"><span className="font-bold text-slate-400">③</span> Upcoming or waiting</span>
            <span className="flex items-center gap-1"><span aria-hidden="true">🏁</span> First-game eligibility milestone</span>
          </div>
          {renderItems.map((item, ri) => {
            const isLastRi = ri === renderItems.length - 1;

            // ── Milestone marker ──
            if (item.kind === 'milestone') {
              const railBg = item.prevComplete ? '#059669' : '#e2e8f0';
              return (
                <div key="milestone" className="flex gap-3">
                  <div className="flex flex-col items-center" style={{ width: 28 }}>
                    <div style={{ width: 2, height: 14, backgroundColor: railBg, flexShrink: 0 }} />
                    <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">🏁</span>
                    {!isLastRi ? (
                      <div style={{ width: 2, flex: 1, minHeight: 10, backgroundColor: '#e2e8f0' }} />
                    ) : null}
                  </div>
                  <div className="flex flex-1 items-center pb-5">
                    <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <p className="text-sm font-semibold text-amber-700">First paid game unlocks here.</p>
                    </div>
                  </div>
                </div>
              );
            }

            // ── Step row ──
            const { step, idx } = item;
            const nodeState: 'complete' | 'current' | 'locked' =
              !placementConfirmed
                ? 'locked'
                : step.status === 'complete'
                  ? 'complete'
                  : step.status === 'available'
                    ? 'current'
                    : 'locked';
            const railColor =
              !placementConfirmed ? '#e2e8f0' : step.status === 'complete' ? '#059669' : '#e2e8f0';
            const prereq = step.prerequisite_step_id
              ? sortedSteps.find((s) => s.step_id === step.prerequisite_step_id)
              : null;
            const desc = getStepDescription(step);
            const costText = getCostText(step);
            const cadenceLabel = step.config?.count_required
              ? `${step.config.count_required} required`
              : step.cadence === 'biennial'
                ? 'biennial'
                : step.cadence === 'one_time'
                  ? 'one-time'
                  : 'annual';
            const metaChip = [costText, cadenceLabel].filter(Boolean).join(' · ');
            const audience =
              !step.required && step.config?.required_for?.length
                ? formatAudience(step.config.required_for)
                : null;
            const completedDate = step.completed_at
              ? new Date(step.completed_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : null;
            const dueDate = step.due_at ? new Date(step.due_at) : null;
            const isOverdue =
              dueDate !== null && step.status !== 'complete' && dueDate.getTime() < Date.now();
            const dueDateStr =
              dueDate && step.status !== 'complete'
                ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : null;
            const isChapter = step.authority === 'chapter';
            const authCls = isChapter ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700';
            const authLabel = isChapter ? 'DBOA' : 'THSBOA';

            // Suppress unused idx warning (used for future milestone placement)
            void idx;

            return (
              <div key={step.step_id} className="flex gap-3">
                {/* Left: node + rail */}
                <div className="flex flex-col items-center" style={{ width: 28 }}>
                  <NodeCircle state={nodeState} number={step.sort_order} />
                  {!isLastRi ? (
                    <div style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: railColor }} />
                  ) : null}
                </div>

                {/* Right: content */}
                <div className={`min-w-0 flex-1 pt-0.5 ${isLastRi ? 'pb-0' : 'pb-6'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-sm font-semibold leading-snug ${
                        !placementConfirmed || step.status === 'locked' ? 'text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {step.name}
                    </h3>
                    {metaChip ? (
                      <span className="mt-0.5 shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {metaChip}
                      </span>
                    ) : null}
                  </div>

                  {desc ? (
                    <p
                      className={`mt-0.5 text-sm ${
                        step.status === 'locked' ? 'text-slate-500' : 'text-slate-500'
                      }`}
                    >
                      {desc}
                    </p>
                  ) : null}

                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stepStatusLabel(step).cls}`}>
                      {stepStatusLabel(step).text}
                    </span>
                    {step.required ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        Required
                      </span>
                    ) : audience ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        {audience}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        If applicable
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${authCls}`}>
                      {authLabel}
                    </span>
                    {completedDate ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        ✓ {completedDate}
                      </span>
                    ) : null}
                    {dueDateStr ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          isOverdue ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isOverdue ? `Overdue · ${dueDateStr}` : `Due ${dueDateStr}`}
                      </span>
                    ) : null}
                  </div>

                  {prereq ? (
                    <p className="mt-1.5 text-xs text-slate-400">
                      Unlocks after:{' '}
                      <span className="font-semibold text-slate-600">{prereq.name}</span>
                    </p>
                  ) : null}

                  {placementConfirmed ? (
                    <div className="mt-2">{renderStepAction(step)}</div>
                  ) : null}

                  {/* ── Attendance session list ── */}
                  {step.step_type === 'attendance' && placementConfirmed ? (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => toggleAttendanceSessions(step.step_id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
                      >
                        <span>{expandedAttendance[step.step_id] ? '▴' : '▾'}</span>
                        <span>Sessions</span>
                      </button>

                      {expandedAttendance[step.step_id] ? (
                        stepSessionsLoading[step.step_id] ? (
                          <p className="mt-2 text-xs text-slate-400">Loading sessions…</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {step.config?.count_required ? (
                              <p className="text-xs font-semibold text-slate-600">
                                Attended{' '}
                                {(stepSessions[step.step_id] ?? []).filter(
                                  (s) => s.my_status === 'attended',
                                ).length}{' '}
                                of {step.config.count_required} required
                              </p>
                            ) : null}
                            {(stepSessions[step.step_id] ?? []).length === 0 ? (
                              <p className="text-xs text-slate-400">No sessions scheduled yet.</p>
                            ) : (
                              (stepSessions[step.step_id] ?? []).map((sess) => (
                                <div
                                  key={sess.session_id}
                                  className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-900">
                                      {sess.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {new Date(sess.starts_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })}
                                      {sess.location ? ` · ${sess.location}` : ''}
                                    </p>
                                  </div>
                                  <SessionStatusPill status={sess.my_status} />
                                </div>
                              ))
                            )}
                          </div>
                        )
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <Card className="mt-4 p-6">
          <p className="text-sm text-slate-500">
            No steps found for this registration. Contact your chapter for help.
          </p>
        </Card>
      )}
        </div>
      </div>

      {/* Page-level error (post-load) */}
      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
