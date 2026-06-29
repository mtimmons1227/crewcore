import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui';

type ChapterRow = {
  id: string;
  name: string;
  logo_url: string | null;
};

type PipelineCycle = {
  id: string;
  person_id: string | null;
  person?: { full_name?: string | null; email?: string | null; phone?: string | null } | null;
  chapter_id: string;
  sport_id?: string | null;
  season_id?: string | null;
  member_type?: string | null;
  status: 'in_progress' | 'cleared' | 'lapsed' | string;
  clearance_level?: 'none' | 'regular' | 'playoff' | string | null;
  cleared_at?: string | null;
  access_token?: string | null;
  created_at: string;
};

type StepCompletion = {
  id: string;
  cycle_id: string;
  workflow_step_id?: string | null;
  status: string;
  completed_at?: string | null;
  due_at?: string | null;
};

type WorkflowStep = {
  id: string;
  name: string;
  sort_order: number;
  required: boolean;
};

type AuthState = 'login' | 'signup';

const MEMBER_TYPE_COLORS: Record<string, string> = {
  new: 'bg-emerald-50 text-emerald-700',
  returning: 'bg-blue-50 text-blue-700',
  transfer: 'bg-violet-50 text-violet-700',
};

function capitalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function MemberTypeBadge({ type }: { type: string | null | undefined }) {
  if (!type) return null;
  const color = MEMBER_TYPE_COLORS[type] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {capitalize(type)}
    </span>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function CommandCenterPage() {
  const [authMode, setAuthMode] = useState<AuthState>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<null | { user: { email: string | null } }>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [registrationCycles, setRegistrationCycles] = useState<PipelineCycle[]>([]);
  const [stepCompletions, setStepCompletions] = useState<StepCompletion[]>([]);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'stalled' | 'cleared'>('all');
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<ChapterRow | null>(null);

  useEffect(() => {
    supabase
      .from('chapter')
      .select('id,name,logo_url')
      .eq('slug', 'DBOA')
      .single()
      .then(({ data }) => {
        if (data) setChapter(data as ChapterRow);
      });
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session?.user ? { user: { email: data.session.user.email ?? null } } : null);
      setInitializing(false);
    };

    fetchSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, sessionData) => {
      setSession(sessionData?.user ? { user: { email: sessionData.user.email ?? null } } : null);
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setRegistrationCycles([]);
      setStepCompletions([]);
      setWorkflowSteps([]);
      return;
    }

    const fetchPipeline = async () => {
      setPipelineLoading(true);
      setPipelineError(null);

      const cyclesResponse = await supabase
        .from<'registration_cycle', PipelineCycle>('registration_cycle')
        .select(
          'id,person_id,chapter_id,sport_id,season_id,member_type,status,clearance_level,cleared_at,access_token,created_at,person:person_id(full_name,email,phone),step_completion!cycle_id(id,workflow_step_id,status,completed_at,due_at)'
        )
        .order('created_at', { ascending: false });

      const stepsResponse = await supabase
        .from<'workflow_step', WorkflowStep>('workflow_step')
        .select('id,name,sort_order,required')
        .order('sort_order', { ascending: true });

      if (cyclesResponse.error) {
        setPipelineError('Unable to load pipeline cycles. This may not be configured for your chapter yet.');
      } else {
        const cycles = (cyclesResponse.data ?? []) as any[];
        const flatStepCompletions: StepCompletion[] = [];
        cycles.forEach((c) => {
          if (Array.isArray(c.step_completion)) {
            c.step_completion.forEach((sc: any) => {
              flatStepCompletions.push({
                id: sc.id ?? c.id + '::' + (sc.workflow_step_id ?? sc.step_name ?? ''),
                cycle_id: c.id,
                workflow_step_id: sc.workflow_step_id,
                status: sc.status,
                completed_at: sc.completed_at,
                due_at: sc.due_at,
              });
            });
          }
        });

        setRegistrationCycles(cycles as PipelineCycle[]);
        setStepCompletions(flatStepCompletions);
      }

      if (!stepsResponse.error) {
        setWorkflowSteps(stepsResponse.data ?? []);
      }

      setPipelineLoading(false);
    };

    fetchPipeline();
  }, [session]);

  const pipelineSummary = useMemo(() => {
    const totalCycles = registrationCycles.length;
    const completedCycles = registrationCycles.filter((cycle) => cycle.status === 'cleared' || cycle.status === 'completed').length;
    const stalledCycles = registrationCycles.filter((cycle) => {
      if (cycle.status === 'cleared') return false;
      const related = stepCompletions.filter((s) => s.cycle_id === cycle.id);
      return related.some(
        (s) => s.due_at && s.status !== 'complete' && new Date(s.due_at).getTime() < Date.now()
      );
    }).length;

    const totalSteps = stepCompletions.length;
    const dropoutSteps = stepCompletions.filter((step) => step.status === 'dropout').length;

    return {
      totalCycles,
      completedCycles,
      stalledCycles,
      dropoutRate: totalSteps > 0 ? Math.round((dropoutSteps / totalSteps) * 100) : 0,
    };
  }, [registrationCycles, stepCompletions]);

  const handleSignIn = async () => {
    setFormError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setFormError(signInError.message);
    setLoading(false);
  };

  const handleSignUp = async () => {
    setFormError(null);
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) setFormError(signUpError.message);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRegistrationCycles([]);
    setStepCompletions([]);
    setWorkflowSteps([]);
  };

  const orderedWorkflowSteps = useMemo(
    () => [...workflowSteps].sort((a, b) => a.sort_order - b.sort_order),
    [workflowSteps]
  );

  const visibleRows = useMemo(() => {
    const now = Date.now();

    return registrationCycles
      .map((cycle) => {
        const related = stepCompletions.filter((s) => s.cycle_id === cycle.id);
        const completedSteps = related.filter((s) => s.status === 'complete').length;
        const ageDays = Math.max(0, Math.floor((now - new Date(cycle.created_at).getTime()) / (1000 * 60 * 60 * 24)));
        const isStalled =
          cycle.status !== 'cleared' &&
          related.some((s) => s.due_at && s.status !== 'complete' && new Date(s.due_at).getTime() < now);
        const totalSteps = orderedWorkflowSteps.length || 8;

        let currentStepName = 'Unknown';
        if (orderedWorkflowSteps.length > 0) {
          const firstIncomplete = orderedWorkflowSteps.find(
            (ws) => !related.some((rc) => rc.workflow_step_id === ws.id && rc.status === 'complete')
          );
          currentStepName = firstIncomplete?.name ?? orderedWorkflowSteps[orderedWorkflowSteps.length - 1]?.name ?? '—';
        }

        return {
          cycle,
          person: cycle.person,
          completedSteps,
          totalSteps,
          currentStepName,
          ageDays,
          isStalled,
          createdAt: new Date(cycle.created_at).getTime(),
        };
      })
      .filter((row) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        const name = (row.person?.full_name ?? '').toLowerCase();
        const em = (row.person?.email ?? '').toLowerCase();
        return name.includes(q) || em.includes(q);
      })
      .filter((row) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'stalled') return row.isStalled;
        if (statusFilter === 'in_progress') return !row.isStalled && row.cycle.status !== 'cleared';
        if (statusFilter === 'cleared') return row.cycle.status === 'cleared';
        return true;
      })
      .sort((a, b) => {
        const aGroup = a.isStalled ? 0 : a.cycle.status === 'cleared' ? 2 : 1;
        const bGroup = b.isStalled ? 0 : b.cycle.status === 'cleared' ? 2 : 1;
        if (aGroup !== bGroup) return aGroup - bGroup;
        return a.createdAt - b.createdAt;
      });
  }, [orderedWorkflowSteps, registrationCycles, searchQuery, statusFilter, stepCompletions]);

  const ROW_COLS =
    'md:grid-cols-[minmax(260px,1.8fr)_minmax(170px,1fr)_minmax(180px,1.2fr)_80px_120px]';

  const header = (
    <header className="rounded-panel bg-slate-900 px-5 py-4 text-white shadow-soft sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          {chapter?.logo_url ? (
            <img
              src={chapter.logo_url}
              alt={`${chapter.name} logo`}
              className="h-11 w-auto shrink-0 rounded-lg object-contain"
            />
          ) : null}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">CrewCore</div>
            <div className="text-xl font-semibold">CrewCore — DBOA</div>
            <div className="mt-1 text-sm text-slate-400">Command Center for staff and chapter operations</div>
          </div>
        </div>
        {session ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm">
              <div className="font-medium">{session.user.email ?? 'Unknown user'}</div>
              <div className="text-xs text-slate-300">Staff</div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );

  const authCard = (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">{authMode === 'login' ? 'Sign in' : 'Create an account'}</h2>
        <p className="mt-1 text-sm text-slate-500">Enter your staff email and password to access the Command Center.</p>
      </div>

      <label className="mb-4 block text-sm font-semibold text-slate-700">
        <span className="mb-2 block">Email address</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-0"
        />
      </label>

      <label className="mb-4 block text-sm font-semibold text-slate-700">
        <span className="mb-2 block">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-0"
        />
      </label>

      {formError ? (
        <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>
      ) : null}

      <div className="mt-5">
        <button
          type="button"
          onClick={authMode === 'login' ? handleSignIn : handleSignUp}
          disabled={loading}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Working...' : authMode === 'login' ? 'Sign in' : 'Sign up'}
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {authMode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
          className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2"
        >
          {authMode === 'login' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </Card>
  );

  const pipelineContent = (
    <Card className="mt-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Recruit roster</h2>
          <p className="mt-1 text-sm text-slate-500">Track onboarding progress and spot where recruits stall.</p>
        </div>
        <div className="text-sm text-slate-500">
          Showing {visibleRows.length} of {registrationCycles.length}
        </div>
      </div>

      {pipelineLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading pipeline data…</p>
      ) : pipelineError ? (
        <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{pipelineError}</p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Recruits', value: pipelineSummary.totalCycles },
              { label: 'Cleared', value: pipelineSummary.completedCycles },
              { label: 'Stalled', value: pipelineSummary.stalledCycles },
              { label: 'Dropout rate', value: `${pipelineSummary.dropoutRate}%` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{stat.label}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              placeholder="Search name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none sm:max-w-sm"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span>View</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | 'in_progress' | 'stalled' | 'cleared')
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              >
                <option value="all">All</option>
                <option value="in_progress">In progress</option>
                <option value="stalled">Stalled</option>
                <option value="cleared">Cleared</option>
              </select>
            </label>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            {/* Table header */}
            <div className={`grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 ${ROW_COLS}`}>
              <span>Recruit</span>
              <span>Progress</span>
              <span>Current step</span>
              <span className="text-right">Age</span>
              <span className="text-right">Status</span>
            </div>

            {registrationCycles.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">No registration cycles available yet.</div>
            ) : visibleRows.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">No recruits match this view.</div>
            ) : (
              visibleRows.map((row) => {
                const isExpanded = expandedCycle === row.cycle.id;
                const completionPercent = Math.round((row.completedSteps / Math.max(1, row.totalSteps)) * 100);
                const statusLabel =
                  row.cycle.status === 'cleared'
                    ? `Cleared · ${capitalize(row.cycle.clearance_level ?? 'regular')}`
                    : row.isStalled
                      ? 'Stalled'
                      : row.cycle.status === 'in_progress'
                        ? 'In progress'
                        : 'Not started';
                const pillClass =
                  row.cycle.status === 'cleared'
                    ? 'bg-emerald-50 text-emerald-700'
                    : row.isStalled
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-slate-100 text-slate-700';

                // Step counts for this cycle
                const cycleSteps = stepCompletions.filter((sc) => sc.cycle_id === row.cycle.id);
                const completedCount = cycleSteps.filter((sc) => sc.status === 'complete').length;
                const readyCount = cycleSteps.filter(
                  (sc) => sc.status === 'available' || sc.status === 'in_progress'
                ).length;
                const lockedCount = cycleSteps.filter((sc) => sc.status === 'locked').length;

                return (
                  <div key={row.cycle.id} className="border-b border-slate-200 last:border-b-0">
                    {/* Row */}
                    <div
                      className={`grid cursor-pointer gap-3 px-4 py-4 transition-colors hover:bg-slate-50/60 ${ROW_COLS}`}
                      onClick={() => setExpandedCycle(isExpanded ? null : row.cycle.id)}
                    >
                      {/* Recruit cell — chevron inside on the left */}
                      <div className="flex min-w-0 items-center gap-2.5">
                        <ChevronIcon expanded={isExpanded} />
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                          {initials(row.person?.full_name ?? row.person?.email ?? '??')}
                        </div>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-slate-900">
                              {row.person?.full_name ?? row.person?.email ?? 'Unknown'}
                            </span>
                            <MemberTypeBadge type={row.cycle.member_type} />
                          </div>
                          <div className="truncate text-sm text-slate-500">{row.person?.email ?? ''}</div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                          <span>
                            {row.completedSteps}/{row.totalSteps}
                          </span>
                          <span>{completionPercent}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-slate-900" style={{ width: `${completionPercent}%` }} />
                        </div>
                      </div>

                      {/* Current step */}
                      <div className="truncate text-sm text-slate-700">{row.currentStepName}</div>

                      {/* Age */}
                      <div className="text-right text-sm text-slate-700">{row.ageDays}d</div>

                      {/* Status */}
                      <div className="text-right">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${pillClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded ? (
                      <div className="grid gap-6 border-t border-slate-200 bg-slate-50/80 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,1.1fr)]">
                        {/* Left: Recruit */}
                        <div className="space-y-2.5">
                          <div className="text-sm font-semibold text-slate-900">Recruit</div>
                          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm">
                            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                              <span className="shrink-0 text-slate-500">Name</span>
                              <span className="flex items-center gap-1.5 font-medium text-slate-900">
                                {row.person?.full_name ?? 'Unknown'}
                                <MemberTypeBadge type={row.cycle.member_type} />
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                              <span className="shrink-0 text-slate-500">Email</span>
                              <span className="truncate font-medium text-slate-900">{row.person?.email ?? '—'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                              <span className="shrink-0 text-slate-500">Phone</span>
                              <span className="font-medium text-slate-900">{row.person?.phone ?? '—'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                              <span className="shrink-0 text-slate-500">Started</span>
                              <span className="font-medium text-slate-900">
                                {new Date(row.cycle.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                              <span className="shrink-0 text-slate-500">Current step</span>
                              <span className="text-right font-medium text-slate-900">{row.currentStepName}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                              <span className="shrink-0 text-slate-500">Clearance</span>
                              <span className="font-medium text-slate-900">
                                {capitalize(row.cycle.clearance_level ?? 'none')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Steps */}
                        <div className="space-y-2.5">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-semibold text-slate-900">Steps</span>
                            <span className="text-xs text-slate-500">
                              Completed {completedCount} · Ready {readyCount} · Locked {lockedCount}
                            </span>
                          </div>
                          <div className="space-y-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                            {orderedWorkflowSteps.length > 0 ? (
                              orderedWorkflowSteps.map((ws) => {
                                const completion = stepCompletions.find(
                                  (sc) => sc.cycle_id === row.cycle.id && sc.workflow_step_id === ws.id
                                );
                                const stepStatus = completion?.status ?? 'locked';
                                const isDone = stepStatus === 'complete';
                                const isReady = stepStatus === 'available' || stepStatus === 'in_progress';
                                const isLocked = !isDone && !isReady;
                                const completedAt =
                                  isDone && completion?.completed_at
                                    ? new Date(completion.completed_at).toLocaleDateString()
                                    : null;

                                return (
                                  <div
                                    key={ws.id}
                                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${isLocked ? 'opacity-50' : ''}`}
                                  >
                                    <span
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        isDone
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : isReady
                                            ? 'bg-slate-200 text-slate-700'
                                            : 'bg-slate-100 text-slate-300'
                                      }`}
                                    >
                                      {isDone ? '✓' : isReady ? '●' : '○'}
                                    </span>
                                    <span
                                      className={`flex-1 truncate text-sm ${
                                        isDone
                                          ? 'font-medium text-slate-900'
                                          : isReady
                                            ? 'font-medium text-slate-700'
                                            : 'text-slate-400'
                                      }`}
                                    >
                                      {ws.name}
                                    </span>
                                    {isDone && completedAt ? (
                                      <span className="shrink-0 text-xs text-slate-400">{completedAt}</span>
                                    ) : isReady ? (
                                      <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                                        Ready
                                      </span>
                                    ) : (
                                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                                        Locked
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="px-3 py-3 text-sm text-slate-500">No workflow steps configured.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </Card>
  );

  return (
    <div>
      {header}
      {initializing ? (
        <Card className="mt-6 p-6">
          <p className="text-sm text-slate-500">Checking auth status…</p>
        </Card>
      ) : session ? (
        <>{pipelineContent}</>
      ) : (
        authCard
      )}
    </div>
  );
}
