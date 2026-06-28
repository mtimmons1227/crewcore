import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui';

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
  evidence_url: string | null;
  data: Record<string, unknown>;
  config: StepConfig | null;
  // injected from workflow_step after RPC
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
    person: { email: string | null; full_name: string | null };
  };
  steps: RegistrationStep[];
};

// ── Description helpers ───────────────────────────────────────────────────────

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

function StepTypeIcon({ stepType }: { stepType: string }) {
  switch (stepType) {
    case 'payment':
      return <CreditCardIcon />;
    case 'external_confirm':
      return <ClipboardCheckIcon />;
    case 'credential':
      return <ShieldIcon />;
    case 'attendance':
      return <UsersIcon />;
    case 'assessment':
      return <GraduationCapIcon />;
    case 'acknowledgment':
      return <BookIcon />;
    default:
      return <ClipboardCheckIcon />;
  }
}

// ── Shared class constants (match CommandCenterPage / LeadCapturePage) ─────────

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400';
const primaryBtn =
  'w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70';

// ── Merge authority data (called in both initial load and after refresh) ───────

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
  const [registration, setRegistration] = useState<RegistrationResponse | null>(null);
  const [chapterLogo, setChapterLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const [assessmentScores, setAssessmentScores] = useState<Record<string, string>>({});
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

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
  };

  const renderStepAction = (step: RegistrationStep) => {
    const scoreValue = assessmentScores[step.step_id] ?? '';
    const isAssessment = step.step_type === 'assessment';
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

      return (
        <button
          type="button"
          onClick={() => handleCompleteStep(step.step_id)}
          disabled={busyStep === step.step_id}
          className={`mt-1 ${primaryBtn}`}
        >
          {busyStep === step.step_id ? 'Marking done…' : 'Mark done'}
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

    return null;
  };

  // ── Loading / error shells ────────────────────────────────────────────────

  const shellHeader = (
    <header className="rounded-panel bg-slate-900 px-5 py-4 text-white shadow-soft sm:px-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          CrewCore Recruit
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
  const sortedSteps = steps.slice().sort((a, b) => a.sort_order - b.sort_order);
  const completedCount = sortedSteps.filter((s) => s.status === 'complete').length;
  const progressPct = sortedSteps.length > 0 ? Math.round((completedCount / sortedSteps.length) * 100) : 0;
  const firstName = cycle.person.full_name?.split(' ')[0] ?? cycle.person.email ?? 'there';

  // Full chapter name after the slug separator; fall back to the whole string
  const chapterParts = cycle.chapter.split(/\s[-–—]\s/);
  const fullChapterName = chapterParts.length > 1 ? chapterParts.slice(1).join(' — ') : cycle.chapter;

  // First-year total fees from step configs (new official pricing)
  const totalFees = sortedSteps.reduce((sum, step) => {
    const c = step.config;
    if (!c) return sum;
    if (Array.isArray(c.pricing)) {
      const entry = c.pricing.find((p) => p.member_type === 'new') ?? c.pricing[0];
      if (entry?.amount) return sum + Number(entry.amount);
    }
    if (c.fee != null) return sum + Number(c.fee);
    return sum;
  }, 0);

  const clearancePill =
    cycle.clearance_level === 'playoff'
      ? { label: 'Playoff cleared', cls: 'bg-emerald-50 text-emerald-700' }
      : cycle.clearance_level === 'regular'
        ? { label: 'Regular season cleared', cls: 'bg-emerald-50 text-emerald-700' }
        : null;

  const statTiles = [
    { label: 'Steps', value: String(sortedSteps.length) },
    { label: 'First-year fees', value: totalFees > 0 ? `$${totalFees}` : '—' },
    { label: 'Outcome', value: 'Cleared' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Header (matches CommandCenterPage / LeadCapturePage exactly) ── */}
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
              CrewCore Recruit
            </div>
            <div className="text-xl font-semibold">Your path to officiating</div>
            <div className="mt-1 text-sm text-slate-400">
              {fullChapterName} · {cycle.season} season
            </div>
          </div>
        </div>
      </header>

      {/* ── Summary card ── */}
      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Welcome, {firstName}.</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {completedCount} of {sortedSteps.length} steps complete
            </p>
          </div>
          {clearancePill ? (
            <span
              className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${clearancePill.cls}`}
            >
              {clearancePill.label}
            </span>
          ) : null}
        </div>

        {/* Stat tiles — same pattern as Command Center CYCLES / CLEARED / STALLED */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {statTiles.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {stat.label}
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar — neutral slate, matching the Command Center roster bar */}
        <div className="mt-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1.5 text-right text-xs font-medium text-slate-400">{progressPct}%</div>
        </div>
      </Card>

      {/* ── Legend ── */}
      <div className="mt-4 flex gap-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
          DBOA chapter
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
          THSBOA state
        </div>
      </div>

      {/* ── Timeline ── */}
      {sortedSteps.length > 0 ? (
        <Card className="mt-4 p-5 sm:p-6">
          {sortedSteps.map((step, idx) => {
            const isLast = idx === sortedSteps.length - 1;
            const isChapter = step.authority === 'chapter';
            const prereq = step.prerequisite_step_id
              ? sortedSteps.find((s) => s.step_id === step.prerequisite_step_id)
              : null;
            const desc = getStepDescription(step);
            const costText = getCostText(step);
            const cadenceLabel =
              step.cadence === 'biennial'
                ? 'Every 2 yrs'
                : step.cadence === 'one_time'
                  ? 'One-time'
                  : 'Annual';
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

            // Icon tile background — authority tint for available, neutral slate otherwise.
            // Connector and completed marker are always neutral slate (no green).
            const tileCls =
              step.status === 'complete'
                ? 'bg-slate-900 text-white'
                : step.status === 'available'
                  ? isChapter
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-blue-50 text-blue-600'
                  : 'bg-slate-100 text-slate-300';

            // Authority chip — appears only here and on the icon tile tint
            const authCls = isChapter
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-blue-50 text-blue-700';
            const authLabel = isChapter ? 'DBOA' : 'THSBOA';

            return (
              <div key={step.step_id} className="flex gap-4">
                {/* ── Icon tile + connector ── */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tileCls}`}
                  >
                    {step.status === 'complete' ? (
                      <CheckIcon />
                    ) : (
                      <StepTypeIcon stepType={step.step_type} />
                    )}
                  </div>
                  {/* Connector is always neutral slate — no green */}
                  {!isLast && (
                    <div
                      className="w-0.5 flex-1 bg-slate-200"
                      style={{ minHeight: 20 }}
                    />
                  )}
                </div>

                {/* ── Step content ── */}
                <div className={`min-w-0 flex-1 pt-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                  {/* Step label + single cost·cadence chip */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Step {step.sort_order}
                    </span>
                    {metaChip ? (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {metaChip}
                      </span>
                    ) : null}
                  </div>

                  {/* Step name — always slate, no authority accent */}
                  <h3
                    className={`mt-0.5 text-sm font-semibold leading-snug ${
                      step.status === 'locked' ? 'text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    {step.name}
                  </h3>

                  {/* One-line description */}
                  {desc ? (
                    <p
                      className={`mt-0.5 text-sm ${
                        step.status === 'locked' ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {desc}
                    </p>
                  ) : null}

                  {/* Tag row: Required | audience, authority chip, completed date */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {step.required ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        Required
                      </span>
                    ) : audience ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        {audience}
                      </span>
                    ) : null}

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${authCls}`}
                    >
                      {authLabel}
                    </span>

                    {/* Completed date — neutral slate, not green */}
                    {completedDate ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        ✓ {completedDate}
                      </span>
                    ) : null}
                  </div>

                  {/* Unlocks-after note */}
                  {prereq ? (
                    <p className="mt-1.5 text-xs text-slate-400">
                      Unlocks after:{' '}
                      <span className="font-semibold text-slate-600">{prereq.name}</span>
                    </p>
                  ) : null}

                  {/* Self-report action */}
                  <div className="mt-2">{renderStepAction(step)}</div>
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

      {/* Page-level error (post-load) */}
      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
