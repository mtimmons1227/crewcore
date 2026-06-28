import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

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
        c.dates.length > 1 ? `${fmt(c.dates[0])} – ${fmt(c.dates[c.dates.length - 1])}` : fmt(c.dates[0]),
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

// ── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2" y="6.5" width="10" height="6.5" rx="1.8" fill="currentColor" opacity="0.45" />
      <path d="M4 6.5V4.5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400';
const primaryBtn =
  'w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70';

export default function RecruitMenuPage() {
  const { token } = useParams();
  const [registration, setRegistration] = useState<RegistrationResponse | null>(null);
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
      const stepIds = raw.steps.map((s) => s.step_id);

      // Fetch authority + prerequisite_step_id — not returned by get_registration
      const { data: wsData } = await supabase
        .from('workflow_step')
        .select('id, authority, prerequisite_step_id')
        .in('id', stepIds);

      const wsMap: Record<string, { authority: 'state' | 'chapter'; prerequisite_step_id: string | null }> = {};
      for (const ws of wsData ?? []) {
        wsMap[ws.id] = {
          authority: (ws.authority as 'state' | 'chapter') ?? 'chapter',
          prerequisite_step_id: ws.prerequisite_step_id ?? null,
        };
      }

      const stepsWithMeta: RegistrationStep[] = raw.steps.map((s) => ({
        ...s,
        authority: wsMap[s.step_id]?.authority ?? 'chapter',
        prerequisite_step_id: wsMap[s.step_id]?.prerequisite_step_id ?? null,
      }));

      setRegistration({ cycle: raw.cycle, steps: stepsWithMeta });
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

    // Re-merge authority data after refresh
    const raw = data as RegistrationResponse;
    const stepIds = raw.steps.map((s) => s.step_id);
    const { data: wsData } = await supabase
      .from('workflow_step')
      .select('id, authority, prerequisite_step_id')
      .in('id', stepIds);

    const wsMap: Record<string, { authority: 'state' | 'chapter'; prerequisite_step_id: string | null }> = {};
    for (const ws of wsData ?? []) {
      wsMap[ws.id] = {
        authority: (ws.authority as 'state' | 'chapter') ?? 'chapter',
        prerequisite_step_id: ws.prerequisite_step_id ?? null,
      };
    }

    setRegistration({
      cycle: raw.cycle,
      steps: raw.steps.map((s) => ({
        ...s,
        authority: wsMap[s.step_id]?.authority ?? 'chapter',
        prerequisite_step_id: wsMap[s.step_id]?.prerequisite_step_id ?? null,
      })),
    });
    setBusyStep(null);
  };

  const renderStepAction = (step: RegistrationStep) => {
    const scoreValue = assessmentScores[step.step_id] ?? '';
    const isAssessment = step.step_type === 'assessment';
    const score = parseInt(scoreValue, 10);

    if (step.status === 'available' && step.completion_mode === 'self_report') {
      if (isAssessment) {
        const invalidScore = Number.isNaN(score) || score < 0 || score > 100;
        const canSubmit = !invalidScore && score >= 70;
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
              disabled={busyStep === step.step_id || !canSubmit}
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

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <header className="rounded-panel bg-slate-900 px-5 py-4 text-white shadow-soft sm:px-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">CrewCore Recruit</div>
          <div className="mt-0.5 text-xl font-semibold">Onboarding journey</div>
        </header>
        <Card className="mt-6 p-6">
          <p className="text-sm text-slate-500">Loading your registration…</p>
        </Card>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div>
        <header className="rounded-panel bg-slate-900 px-5 py-4 text-white shadow-soft sm:px-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">CrewCore Recruit</div>
          <div className="mt-0.5 text-xl font-semibold">Onboarding journey</div>
        </header>
        <Card className="mt-6 p-6">
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error ?? 'Unable to load registration. Please check your link.'}
          </p>
        </Card>
      </div>
    );
  }

  const { cycle, steps } = registration;
  const sortedSteps = steps.slice().sort((a, b) => a.sort_order - b.sort_order);
  const completedCount = sortedSteps.filter((s) => s.status === 'complete').length;
  const progressPct = sortedSteps.length > 0 ? Math.round((completedCount / sortedSteps.length) * 100) : 0;
  const nextStep = sortedSteps.find((s) => s.status === 'available');
  const firstName = cycle.person.full_name?.split(' ')[0] ?? cycle.person.email ?? 'there';

  const clearancePill =
    cycle.clearance_level === 'playoff'
      ? { label: 'Playoff cleared', cls: 'bg-emerald-50 text-emerald-700' }
      : cycle.clearance_level === 'regular'
        ? { label: 'Regular season cleared', cls: 'bg-emerald-50 text-emerald-700' }
        : null;

  return (
    <div>
      {/* Header */}
      <header className="rounded-panel bg-slate-900 px-5 py-4 text-white shadow-soft sm:px-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">CrewCore Recruit</div>
          <div className="mt-0.5 text-xl font-semibold">
            {cycle.chapter.split(' — ')[0] ?? 'DBOA'}
          </div>
          <div className="mt-1 text-sm text-slate-400">Your officiating onboarding journey</div>
        </div>
      </header>

      {/* Progress card */}
      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Welcome back, {firstName}.</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {completedCount} of {sortedSteps.length} steps complete
            </p>
          </div>
          {clearancePill ? (
            <span className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${clearancePill.cls}`}>
              {clearancePill.label}
            </span>
          ) : null}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="mt-2 text-right text-xs font-medium text-slate-400">{progressPct}%</div>
      </Card>

      {/* Legend */}
      <div className="mt-4 flex gap-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
          DBOA (chapter)
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <span className="h-3 w-3 rounded-full bg-blue-500 shrink-0" />
          THSBOA (state)
        </div>
      </div>

      {/* Pathway */}
      {sortedSteps.length > 0 ? (
        <Card className="mt-4 p-5 sm:p-6">
          {sortedSteps.map((step, idx) => {
            const isLast = idx === sortedSteps.length - 1;
            const isNext = step.step_id === nextStep?.step_id;
            const isChapter = step.authority === 'chapter';
            const prereq = step.prerequisite_step_id
              ? sortedSteps.find((s) => s.step_id === step.prerequisite_step_id)
              : null;
            const desc = getStepDescription(step);
            const costText = getCostText(step);
            const audience =
              step.required === false && step.config?.required_for?.length
                ? formatAudience(step.config.required_for)
                : null;
            const completedDate =
              step.completed_at
                ? new Date(step.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : null;

            // Icon classes
            const iconCls = (() => {
              if (step.status === 'complete') return 'bg-emerald-500 text-white';
              if (step.status === 'available')
                return isChapter
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                  : 'bg-blue-600 text-white ring-4 ring-blue-100';
              return 'bg-slate-200 text-slate-400';
            })();

            // Connector color
            const connectorCls = step.status === 'complete' ? 'bg-emerald-300' : 'bg-slate-200';

            // Authority chip
            const authCls = isChapter
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-blue-50 text-blue-700';
            const authLabel = isChapter ? 'DBOA' : 'THSBOA';

            return (
              <div key={step.step_id} className="flex gap-3.5">
                {/* Icon + connector column */}
                <div className="flex flex-col items-center">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-shadow ${iconCls}`}>
                    {step.status === 'complete' ? (
                      <CheckIcon />
                    ) : step.status === 'locked' ? (
                      <LockIcon />
                    ) : (
                      step.sort_order
                    )}
                  </div>
                  {!isLast && (
                    <div className={`mt-1 w-0.5 flex-1 rounded-sm ${connectorCls}`} style={{ minHeight: 20 }} />
                  )}
                </div>

                {/* Content */}
                <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                  {/* Step number + meta chips */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Step {step.sort_order}
                    </span>
                    <div className="flex gap-1.5">
                      {costText ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          {costText}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {step.cadence === 'biennial' ? 'Every 2 yrs' : step.cadence === 'one_time' ? 'One-time' : 'Annual'}
                      </span>
                    </div>
                  </div>

                  {/* Step name */}
                  <h3 className={`mt-0.5 text-sm font-semibold leading-snug ${
                    step.status === 'locked'
                      ? 'text-slate-400'
                      : isNext
                        ? isChapter ? 'text-emerald-700' : 'text-blue-700'
                        : 'text-slate-900'
                  }`}>
                    {step.name}
                  </h3>

                  {/* One-line description */}
                  {desc ? (
                    <p className={`mt-0.5 text-sm ${step.status === 'locked' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {desc}
                    </p>
                  ) : null}

                  {/* Tags row */}
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
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${authCls}`}>
                      {authLabel}
                    </span>
                    {isNext ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        isChapter ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        Do this next
                      </span>
                    ) : null}
                    {step.status === 'complete' && completedDate ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                        ✓ {completedDate}
                      </span>
                    ) : null}
                  </div>

                  {/* Prerequisite note */}
                  {prereq ? (
                    <p className="mt-1.5 text-xs text-slate-400">
                      Unlocks after:{' '}
                      <span className="font-semibold text-slate-600">{prereq.name}</span>
                    </p>
                  ) : null}

                  {/* Action */}
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
