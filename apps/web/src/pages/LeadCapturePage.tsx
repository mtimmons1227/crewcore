import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui';

type ChapterRow = {
  id: string;
  name: string;
  tagline: string | null;
  hero_text: string | null;
  accent_color: string | null;
  logo_url: string | null;
};

type SportRow = {
  id: string;
  name: string;
};

type WorkflowStep = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  step_type: string;
  cadence: string | null;
  required: boolean;
  completion_mode: string;
  config: Record<string, unknown> | null;
  prerequisite_step_id: string | null;
  audience: { member_types?: string[] } | null;
};

type LeadFormState = {
  fullName: string;
  phone: string;
  email: string;
};

type FieldErrors = {
  fullName?: string;
  phone?: string;
  email?: string;
};

type MemberType = 'new' | 'returning' | 'transfer' | 'unsure';

const PATH_OPTIONS: { value: MemberType; label: string; desc: string }[] = [
  {
    value: 'new',
    label: 'New to officiating',
    desc: 'First time as an official — complete onboarding from the start.',
  },
  {
    value: 'returning',
    label: 'Returning official',
    desc: 'Renewing with DBOA for the new season.',
  },
  {
    value: 'transfer',
    label: 'Transferring from another chapter',
    desc: 'Already certified — joining DBOA from another chapter.',
  },
  {
    value: 'unsure',
    label: 'Not sure — help me decide',
    desc: "You've officiated informally but never registered with a formal chapter. We'll start you on the new-official path.",
  },
];

// The registration path an "unsure" recruit is enrolled on (safe superset).
const effectivePath = (m: MemberType): Exclude<MemberType, 'unsure'> =>
  m === 'unsure' ? 'new' : m;

// ── Stage grouping for the personalized checklist ──────────────────
const STAGES: { key: string; title: string }[] = [
  { key: 'join', title: 'Join DBOA' },
  { key: 'register', title: 'Complete Registration' },
  { key: 'train', title: 'Prepare & Train' },
  { key: 'ready', title: 'Become Assignment Ready' },
];

const stageForStep = (name: string): string => {
  const n = name.toLowerCase();
  if (/chapter application|chapter dues|join/.test(n)) return 'join';
  if (/state registration|background|abuse|governing/.test(n)) return 'register';
  if (/state test|camp|off-?season|assignment|readiness|evaluation/.test(n)) return 'ready';
  return 'train';
};

// First-year startup cost by path. Dues from thedboa.com (2026-27):
// DBOA new $125 / returning $175 / transfer $175; THSBOA new $70 / returning $110.
// A full uniform set (shirt, pants, shoes, whistle, compression, socks) runs ~$120-$180
// depending on brand and what the official already owns; returning officials reuse theirs.
const PATH_COST: Record<'new' | 'returning' | 'transfer', string> = {
  new: '$315–$375',
  returning: '$285',
  transfer: '$295–$355',
};

// Paths that include buying a uniform (so we can show the "varies by brand" caveat).
const PATH_INCLUDES_UNIFORM: Record<'new' | 'returning' | 'transfer', boolean> = {
  new: true,
  returning: false,
  transfer: true,
};

const UNIFORM_CAVEAT = 'Uniform cost varies by brand and what you already own.';

// New officials start on middle-school games ($50–$55 each) and recoup quickly.
const RECOUP_NOTE =
  'Middle-school games pay $50–$55 each — most new officials recoup their startup cost within about 7 games, and typically work 60–70 games a season.';

const DBOA_CHAPTER_SLUG = 'DBOA';
const BASKETBALL_SPORT_NAME = 'Basketball';

// DBOA brand orange for the primary call-to-action.
const DBOA_ORANGE = '#E8590C';
const DBOA_ORANGE_HOVER = '#C2410C';

const BENEFITS: { title: string; desc: string }[] = [
  {
    title: 'Earn while you learn',
    desc: 'Begin working paid games as you complete your development.',
  },
  {
    title: 'Flexible opportunities',
    desc: 'Choose assignments that work around your availability.',
  },
  {
    title: 'Training and support',
    desc: 'Receive guidance, resources, and mentorship from day one.',
  },
];

const NEXT_STEPS: string[] = [
  'Your information is received by DBOA',
  'You receive a welcome message by email or text',
  'Your registration and training pathway is provided',
];

const inputBase =
  'w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition';
const inputOk = 'border-slate-200 focus:border-slate-400';
const inputErr = 'border-rose-300 bg-rose-50 focus:border-rose-400';
const labelCls = 'block text-sm font-semibold text-slate-700';

// ── Validation helpers ─────────────────────────────────────────────
const digitsOnly = (value: string) => value.replace(/\D/g, '');

const formatPhone = (value: string) => {
  const d = digitsOnly(value).slice(0, 10);
  if (d.length === 0) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const validateName = (value: string): string | undefined => {
  if (value.trim().length < 2) return 'Please enter your full name.';
  return undefined;
};

const validatePhone = (value: string): string | undefined => {
  const d = digitsOnly(value);
  if (d.length !== 10) return 'Enter a 10-digit US phone number.';
  return undefined;
};

const validateEmail = (value: string): string | undefined => {
  if (!isValidEmail(value)) return 'Enter a valid email address.';
  return undefined;
};

export default function LeadCapturePage() {
  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [sport, setSport] = useState<SportRow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [form, setForm] = useState<LeadFormState>({ fullName: '', phone: '', email: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<keyof LeadFormState, boolean>>({
    fullName: false,
    phone: false,
    email: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [memberType, setMemberType] = useState<MemberType | null>(null);
  const submittingRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      const chapterResult = await supabase
        .from('chapter')
        .select('id,name,tagline,hero_text,accent_color,logo_url')
        .eq('slug', DBOA_CHAPTER_SLUG)
        .single();

      const chapterData = chapterResult.data as ChapterRow | null;
      if (chapterResult.error || !chapterData) {
        setError('Unable to load chapter information.');
        setLoading(false);
        return;
      }

      const sportResult = await supabase
        .from('sport')
        .select('id,name')
        .eq('name', BASKETBALL_SPORT_NAME)
        .single();

      const sportData = sportResult.data as SportRow | null;
      if (sportResult.error || !sportData) {
        setError('Unable to load sport information.');
        setLoading(false);
        return;
      }

      const workflowResult = await supabase
        .from('workflow_step')
        .select('id,name,sort_order,step_type,cadence,required,completion_mode,config,prerequisite_step_id,audience')
        .eq('chapter_id', chapterData.id)
        .eq('sport_id', sportData.id)
        .order('sort_order', { ascending: true });

      if (workflowResult.error) setError('Unable to load the registration preview.');

      setChapter(chapterData);
      setSport(sportData);
      setSteps((workflowResult.data as WorkflowStep[]) ?? []);
      setLoading(false);
    }

    const storedToken = window.localStorage.getItem('recruit_registration_token');
    if (storedToken) window.location.href = `/r/${storedToken}`;

    loadData();
  }, []);

  const isFormValid = useMemo(
    () =>
      !validateName(form.fullName) &&
      !validatePhone(form.phone) &&
      !validateEmail(form.email),
    [form],
  );

  const runFieldValidation = (key: keyof LeadFormState, value: string) => {
    const err =
      key === 'fullName'
        ? validateName(value)
        : key === 'phone'
          ? validatePhone(value)
          : validateEmail(value);
    setFieldErrors((cur) => ({ ...cur, [key]: err }));
  };

  const handleChange = (key: keyof LeadFormState, raw: string) => {
    const value = key === 'phone' ? formatPhone(raw) : raw;
    setForm((cur) => ({ ...cur, [key]: value }));
    if (touched[key]) runFieldValidation(key, value);
  };

  const handleBlur = (key: keyof LeadFormState) => {
    setTouched((cur) => ({ ...cur, [key]: true }));
    runFieldValidation(key, form[key]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sport || !chapter) return;

    // Validate every field and surface messages.
    const nextErrors: FieldErrors = {
      fullName: validateName(form.fullName),
      phone: validatePhone(form.phone),
      email: validateEmail(form.email),
    };
    setFieldErrors(nextErrors);
    setTouched({ fullName: true, phone: true, email: true });
    if (nextErrors.fullName || nextErrors.phone || nextErrors.email) return;

    // Prevent duplicate submissions.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc('submit_lead', {
      p_chapter_id: chapter.id,
      p_full_name: form.fullName.trim(),
      p_phone: digitsOnly(form.phone),
      p_email: form.email.trim(),
      p_sport_id: sport.id,
      p_source: 'public-lead-capture',
    });

    if (rpcError) {
      setError('Unable to submit your interest. Please try again.');
      setSaving(false);
      submittingRef.current = false;
      return;
    }

    setSubmitted(true);
    setSaving(false);
    submittingRef.current = false;
  };

  const handleStartRegistration = async () => {
    if (!sport || !chapter || !form.email.trim()) return;
    setRegistrationLoading(true);
    setError(null);

    const path = memberType ? effectivePath(memberType) : 'new';

    const { data, error: rpcError } = await supabase.rpc('start_registration', {
      p_email: form.email.trim(),
      p_chapter_id: chapter.id,
      p_sport_id: sport.id,
      p_member_type: path,
    });

    if (rpcError) {
      setError('Something went wrong starting your registration — please try again.');
      setRegistrationLoading(false);
      return;
    }

    const result = data as { status: string; cycle_id: string; member_type: string; access_token?: string } | null;
    const accessToken = result?.access_token;

    if (!accessToken) {
      setError('Something went wrong starting your registration — please try again.');
      setRegistrationLoading(false);
      return;
    }

    // Fire-and-forget — emails the durable link; does not block navigation
    supabase.functions.invoke('request-magic-link', {
      body: {
        email: form.email.trim(),
        chapter_id: chapter.id,
        sport_id: sport.id,
        member_type: path,
      },
    });

    navigate(`/r/${accessToken}`, { state: { emailSent: true, justSubmitted: true } });
  };

  const chapterName = chapter?.name ?? 'DBOA';
  // Short, data-driven chapter label for inline copy (e.g. "Lakeside").
  const chapterShort = chapterName.split(' ')[0] || chapterName;
  const withChapter = (s: string) => s.replace(/DBOA/g, chapterShort);

  const header = (
    <header className="rounded-panel bg-slate-900 px-5 py-4 text-white shadow-soft sm:px-6">
      <div className="flex items-center gap-3">
        {chapter?.logo_url ? (
          <img
            src={chapter.logo_url}
            alt={`${chapterName} logo`}
            className="h-11 w-auto shrink-0 rounded-lg object-contain"
          />
        ) : null}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            CrewCore Pathway
          </div>
          <div className="text-xl font-semibold">{chapterName}</div>
          <div className="mt-1 text-sm text-slate-400">
            {chapter?.tagline ?? 'Start your officiating journey'}
          </div>
        </div>
      </div>
    </header>
  );

  // ── Loading / error / submitted views: keep single-column, centered ──
  if (loading) {
    return (
      <div>
        {header}
        <div className="mx-auto max-w-lg">
          <Card className="mt-6 p-6">
            <p className="text-sm text-slate-500">Loading chapter info…</p>
          </Card>
        </div>
      </div>
    );
  }

  if (error && !submitted) {
    return (
      <div>
        {header}
        <div className="mx-auto max-w-lg">
          <Card className="mt-6 p-6">
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    const firstName = form.fullName.trim().split(' ')[0] || 'there';

    // Preview the personalized checklist the same way registration seeds it:
    // audience-filtered against the chosen path (unsure → new).
    const path = memberType ? effectivePath(memberType) : null;
    const personalizedSteps = path
      ? steps.filter((s) => {
          const mts = s.audience?.member_types;
          return !mts || mts.length === 0 || mts.includes(path);
        })
      : [];

    const stageGroups = STAGES.map((stage) => ({
      ...stage,
      title: withChapter(stage.title),
      items: personalizedSteps
        .filter((s) => stageForStep(s.name) === stage.key)
        .sort((a, b) => a.sort_order - b.sort_order),
    })).filter((g) => g.items.length > 0);

    let stepCounter = 0;

    return (
      <div>
        {header}
        <div className="mx-auto max-w-lg">
          {/* ── Welcome ── */}
          <Card className="mt-6 p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
                </svg>
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Welcome to CrewCore, {firstName}!
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Your information has been saved securely. Select the option that best
                  describes you, and we'll build the correct officiating path for you.
                </p>
              </div>
            </div>
          </Card>

          {/* ── Path selection ── */}
          <Card className="mt-4 p-6">
            <h3 className="text-base font-semibold text-slate-900">Which best describes you?</h3>
            <p className="mt-1 text-sm text-slate-500">
              We'll show only the requirements that apply to your path.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {PATH_OPTIONS.map((opt) => {
                const selected = memberType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMemberType(opt.value)}
                    className="flex items-start gap-3 rounded-2xl border p-4 text-left transition"
                    style={{
                      backgroundColor: selected ? '#FFF7ED' : 'white',
                      borderColor: selected ? DBOA_ORANGE : '#e2e8f0',
                    }}
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: selected ? DBOA_ORANGE : '#cbd5e1',
                        backgroundColor: selected ? DBOA_ORANGE : 'transparent',
                      }}
                    >
                      {selected ? (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
                        </svg>
                      ) : null}
                    </span>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: selected ? '#9A3412' : '#0f172a' }}
                      >
                        {opt.label}
                      </p>
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: selected ? '#C2410C' : '#64748b' }}
                      >
                        {withChapter(opt.desc)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* ── What happens next (always shown) ── */}
          {!memberType ? (
            <Card className="mt-4 p-6">
              <h3 className="text-base font-semibold text-slate-900">What happens next</h3>
              <ol className="mt-4 space-y-3">
                {[
                  {
                    t: 'Choose your officiating path',
                    d: 'Tell us whether you are new, returning, or transferring.',
                  },
                  {
                    t: 'Receive your personalized checklist',
                    d: 'CrewCore shows only the registration, training, and readiness requirements that apply to you.',
                  },
                  {
                    t: 'Complete each step at your pace',
                    d: 'Your progress is saved automatically, and support is available when you need it.',
                  },
                ].map((s, i) => (
                  <li key={s.t} className="flex gap-3">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: DBOA_ORANGE }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{s.t}</div>
                      <div className="mt-0.5 text-sm text-slate-500">{s.d}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Select the option that best describes you above to see your personalized requirements.
              </p>
            </Card>
          ) : (
            /* ── Personalized checklist (revealed after path selection) ── */
            <Card className="mt-4 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Your personalized {chapterShort} basketball registration path</h3>

              {/* Summary card */}
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-500">
                  <span className="font-semibold text-slate-900">{stageGroups.length}</span> stages
                </span>
                <span className="text-slate-500">
                  <span className="font-semibold text-slate-900">{personalizedSteps.length}</span> requirements
                </span>
                <span className="text-slate-500">
                  Estimated first-year cost:{' '}
                  <span className="font-semibold text-slate-900">
                    {path ? PATH_COST[path] : '—'}
                  </span>
                </span>
              </div>

              {path && PATH_INCLUDES_UNIFORM[path] ? (
                <p className="mt-2 text-xs text-slate-400">{UNIFORM_CAVEAT}</p>
              ) : null}

              {path === 'new' ? (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{RECOUP_NOTE}</p>
              ) : null}

              {stageGroups.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {stageGroups.map((group) => (
                    <div key={group.key}>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {group.title}
                      </div>
                      <ol className="space-y-2">
                        {group.items.map((step) => {
                          stepCounter += 1;
                          return (
                            <li
                              key={step.id}
                              className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                                {stepCounter}
                              </span>
                              <div>
                                <div className="font-semibold text-slate-900">{step.name}</div>
                                {step.description ? (
                                  <div className="mt-0.5 text-slate-500">{step.description}</div>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  We'll build your checklist as soon as you continue.
                </p>
              )}

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleStartRegistration}
                  disabled={registrationLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed"
                  style={{ backgroundColor: registrationLoading ? '#94a3b8' : DBOA_ORANGE }}
                >
                  {registrationLoading ? (
                    <>
                      <Spinner />
                      Building your path…
                    </>
                  ) : (
                    'Build My Registration Path'
                  )}
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ── Main interest form: two-column on desktop, single-column on mobile ──
  return (
    <div>
      {header}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,560px)] lg:items-start">
        {/* Left — value proposition */}
        <div className="rounded-panel bg-slate-900 px-6 py-8 text-white shadow-soft sm:px-8">
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
            Start Your Officiating Journey
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
            Get trained, join a supportive officiating community, and begin working
            basketball games in your area.
          </p>
          <p className="mt-2 text-sm font-medium text-slate-200 sm:text-base">
            No officiating experience is required. Training is provided.
          </p>

          <ul className="mt-7 space-y-4">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: DBOA_ORANGE }}
                >
                  <CheckIcon />
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">{b.title}</div>
                  <div className="mt-0.5 text-sm text-slate-400">{b.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — the form */}
        <Card className="p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900">Take the First Step</h2>
            <p className="mt-1 text-sm text-slate-500">
              Complete this brief form to receive information about becoming a{' '}
              {chapterName} basketball official.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Full name */}
            <div className="mb-4">
              <label htmlFor="lead-name" className={labelCls}>
                Full name
              </label>
              <input
                id="lead-name"
                type="text"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                onBlur={() => handleBlur('fullName')}
                placeholder="Jane Doe"
                autoComplete="name"
                autoCapitalize="words"
                className={`${inputBase} mt-2 ${fieldErrors.fullName ? inputErr : inputOk}`}
                aria-invalid={fieldErrors.fullName ? 'true' : 'false'}
              />
              {fieldErrors.fullName ? (
                <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.fullName}</p>
              ) : null}
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label htmlFor="lead-phone" className={labelCls}>
                Phone number
              </label>
              <input
                id="lead-phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                placeholder="(555) 123-4567"
                autoComplete="tel"
                className={`${inputBase} mt-2 ${fieldErrors.phone ? inputErr : inputOk}`}
                aria-invalid={fieldErrors.phone ? 'true' : 'false'}
              />
              {fieldErrors.phone ? (
                <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.phone}</p>
              ) : null}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="lead-email" className={labelCls}>
                Email address
              </label>
              <input
                id="lead-email"
                type="email"
                inputMode="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                className={`${inputBase} mt-2 ${fieldErrors.email ? inputErr : inputOk}`}
                aria-invalid={fieldErrors.email ? 'true' : 'false'}
              />
              {fieldErrors.email ? (
                <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.email}</p>
              ) : null}
            </div>

            {error ? (
              <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={!isFormValid || saving}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed"
              style={{ backgroundColor: !isFormValid || saving ? '#94a3b8' : DBOA_ORANGE }}
              onMouseEnter={(e) => {
                if (isFormValid && !saving)
                  e.currentTarget.style.backgroundColor = DBOA_ORANGE_HOVER;
              }}
              onMouseLeave={(e) => {
                if (isFormValid && !saving)
                  e.currentTarget.style.backgroundColor = DBOA_ORANGE;
              }}
            >
              {saving ? (
                <>
                  <Spinner />
                  Sending…
                </>
              ) : (
                'Start My Officiating Journey'
              )}
            </button>

            {/* Reassurance box */}
            <div className="mt-4 flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="mt-0.5 shrink-0 text-slate-500">
                <LockIcon />
              </span>
              <p className="text-xs leading-relaxed text-slate-600">
                No account is required. We will use your information only to contact you
                about {chapterName} officiating opportunities.
              </p>
            </div>

            {/* What happens next */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-semibold text-slate-900">What happens next</h3>
              <ol className="mt-3 space-y-2.5">
                {NEXT_STEPS.map((label, i) => (
                  <li key={label} className="flex items-start gap-3 text-sm text-slate-600">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: DBOA_ORANGE }}
                    >
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{withChapter(label)}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-slate-400">
                Your next steps will be sent shortly after submission.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ── Small inline icons / spinner ───────────────────────────────────
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 1a4 4 0 00-4 4v2H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-1V5a4 4 0 00-4-4zm2 6V5a2 2 0 10-4 0v2h4z"
        clipRule="evenodd"
      />
    </svg>
  );
}
