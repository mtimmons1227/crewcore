import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// ── Types ───────────────────────────────────────────────────────────────────────

type Phase = 'entry' | 'questions' | 'compare' | 'result';
type ResultView = 'main' | 'review';

type Answers = {
  want_recommendation: 'recommend' | 'compare' | null;
  afternoon_location_type: string;
  weekday_afternoon_location: string;
  work_zip: string;
  home_zip: string;
  travel_minutes: string;
  weekdays: string[];
  willing_low_level: string;
  evening_location_type: string;
  evening_location: string;
  saturday_availability: string;
  experience: string;
  current_membership: string;
  transport_availability: string;
  share_consent: boolean;
};

type ChapterResult = {
  outcome: string;
  primary: { chapter_id: string; name: string; reason: string };
  alternatives: ChapterDir[];
  disclaimer: string;
};

type ChapterDir = {
  id: string;
  name: string;
  region: string;
  is_integrated: boolean;
  recruitment_url: string | null;
  contact_email: string | null;
  coverage_note: string | null;
};

// ── Question definitions ────────────────────────────────────────────────────────

type QType =
  | 'afternoon-type'
  | 'zip'
  | 'travel'
  | 'weekdays'
  | 'willing'
  | 'evening'
  | 'saturday'
  | 'experience'
  | 'membership'
  | 'transport';

type QuestionDef = {
  id: keyof Answers;
  group: 0 | 1;
  sublabel: string;
  label: string;
  helper?: string;
  placeholder?: string;
  type: QType;
  required: boolean;
  locationNote?: boolean;
  whyWeAsk: string;
};

const ALL_QUESTIONS: QuestionDef[] = [
  {
    id: 'afternoon_location_type',
    group: 0,
    sublabel: 'Early-game location',
    label: 'Where are you usually at 4:00–4:30 p.m. on weekdays?',
    helper:
      'Early games tip off before most people can get home from work — this helps us find games you can actually reach.',
    type: 'afternoon-type',
    required: true,
    whyWeAsk:
      'Your 4–4:30 p.m. location tells us which areas are practical for early weeknight games.',
  },
  {
    id: 'weekday_afternoon_location',
    group: 0,
    sublabel: 'Around 4:00–4:30 p.m.',
    label: 'Around 4:00–4:30 p.m., what area are you usually in?',
    placeholder: 'ZIP or nearest cross streets',
    type: 'zip',
    required: true,
    locationNote: true,
    whyWeAsk:
      'Helps us estimate which gyms and chapters cover the area where you naturally are during early-game hours.',
  },
  {
    id: 'work_zip',
    group: 0,
    sublabel: 'Work or school',
    label: 'What ZIP is your work or school in?',
    placeholder: 'ZIP or nearest intersection',
    type: 'zip',
    required: true,
    locationNote: true,
    whyWeAsk: 'Your commute path can reveal chapter areas you pass through daily.',
  },
  {
    id: 'home_zip',
    group: 0,
    sublabel: 'Home base',
    label: 'What ZIP do you live in?',
    placeholder: 'ZIP or nearest intersection',
    type: 'zip',
    required: true,
    locationNote: true,
    whyWeAsk: 'Tells us which chapters cover your home neighborhood.',
  },
  {
    id: 'travel_minutes',
    group: 1,
    sublabel: 'Travel range',
    label: 'How far are you willing to travel to a game?',
    type: 'travel',
    required: true,
    whyWeAsk:
      'Game sites vary in distance — this sets the outer limit for what we match you with.',
  },
  {
    id: 'weekdays',
    group: 1,
    sublabel: 'Weekday availability',
    label: 'Which weekdays are you generally available?',
    type: 'weekdays',
    required: true,
    whyWeAsk:
      'Chapter meetings and most early games are weeknight evenings — this filters by when you can actually go.',
  },
  {
    id: 'willing_low_level',
    group: 1,
    sublabel: 'Starting level',
    label: 'Willing to begin with middle-school or sub-varsity games?',
    type: 'willing',
    required: true,
    whyWeAsk:
      'Most officials start sub-varsity. Knowing your comfort sets the right expectations from day one.',
  },
  {
    id: 'evening_location_type',
    group: 1,
    sublabel: 'Evening location',
    label: 'Where are you typically located around 6:00–6:30 p.m.?',
    type: 'evening',
    required: false,
    locationNote: true,
    whyWeAsk:
      'A different evening base can open chapters whose game times start later in the evening.',
  },
  {
    id: 'saturday_availability',
    group: 1,
    sublabel: 'Saturday games',
    label: 'Are Saturdays available for you?',
    type: 'saturday',
    required: false,
    whyWeAsk:
      'Saturday games and tournaments are a big part of the schedule — helps us match your full capacity.',
  },
  {
    id: 'experience',
    group: 1,
    sublabel: 'Experience level',
    label: 'Prior officiating experience?',
    type: 'experience',
    required: false,
    whyWeAsk:
      'Helps calibrate chapter expectations and the type of support or mentorship you may want.',
  },
  {
    id: 'current_membership',
    group: 1,
    sublabel: 'Chapter history',
    label: 'Do you currently hold or have you previously held chapter membership?',
    type: 'membership',
    required: false,
    whyWeAsk: "Tells us if you're transitioning from another chapter or starting fresh.",
  },
  {
    id: 'transport_availability',
    group: 1,
    sublabel: 'Transportation',
    label: 'Will you generally have transportation to reach game assignments?',
    type: 'transport',
    required: false,
    whyWeAsk:
      'Many gym sites are in suburban areas — helps us flag assignments that may be hard to reach.',
  },
];

// Only include the dedicated afternoon-ZIP screen for Varies/Other;
// for Work/School/Home, that ZIP is captured by the matching screen.
function computeVisibleQuestions(answers: Answers): QuestionDef[] {
  const type = answers.afternoon_location_type;
  return ALL_QUESTIONS.filter((q) => {
    if (q.id === 'weekday_afternoon_location') {
      return type === 'varies' || type === 'other';
    }
    return true;
  });
}

const INITIAL: Answers = {
  want_recommendation: null,
  afternoon_location_type: '',
  weekday_afternoon_location: '',
  work_zip: '',
  home_zip: '',
  travel_minutes: '',
  weekdays: [],
  willing_low_level: '',
  evening_location_type: '',
  evening_location: '',
  saturday_availability: '',
  experience: '',
  current_membership: '',
  transport_availability: '',
  share_consent: false,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const GROUP_LABELS = ['The Situation', 'The Facts'] as const;

const WEEKDAY_OPTS = [
  { v: 'mon', l: 'Mon' },
  { v: 'tue', l: 'Tue' },
  { v: 'wed', l: 'Wed' },
  { v: 'thu', l: 'Thu' },
  { v: 'fri', l: 'Fri' },
];

const AFTERNOON_OPTS = [
  { v: 'work', l: 'At work' },
  { v: 'school', l: 'At school' },
  { v: 'home', l: 'At home' },
  { v: 'varies', l: 'Varies' },
  { v: 'other', l: 'Other' },
];

const EVENING_OPTS = [
  { v: 'home', l: 'Home' },
  { v: 'work', l: 'Work' },
  { v: 'varies', l: 'Varies' },
  { v: 'other', l: 'Other' },
];

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400';

function choiceBtnCls(selected: boolean) {
  return [
    'rounded-2xl border px-4 py-3.5 text-sm font-semibold transition text-left',
    selected
      ? 'border-slate-900 bg-slate-900 text-white'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ].join(' ');
}

const LOCATION_NOTE =
  'We use this location only to estimate which chapter and early-game areas may be practical for you. You may enter a nearby intersection or ZIP code instead of an exact address.';

// ── Module-scope components (hoisted to avoid re-mount on state change) ─────────

function RouteMap() {
  return (
    <div className="mt-4 hidden flex-col items-center rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center lg:flex">
      <div className="flex items-center gap-2 text-2xl">
        <span title="Home">🏠</span>
        <span className="text-sm text-slate-300">—</span>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-lg"
          title="Chapter"
        >
          🏀
        </span>
        <span className="text-sm text-slate-300">—</span>
        <span title="Work">💼</span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Chapter fit is about matching you to gyms that fall naturally between your daily locations.
      </p>
    </div>
  );
}

// Hoisted shell — was inside MakeTheCallPage causing focus-drop remounts.
function Shell({ groupLabel, children }: { groupLabel: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="bg-slate-900 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          CrewCore
        </p>
        <p className="mt-0.5 text-lg font-bold text-white">
          Make the Call{groupLabel ? ` · ${groupLabel}` : '.'}
        </p>
      </header>
      <div className="flex flex-1 flex-col px-5 py-6 sm:mx-auto sm:w-full sm:max-w-2xl">
        {children}
      </div>
    </div>
  );
}

// Plain chapter list — name + website link + "Integrated with CrewCore" tag. No referral/consent.
function DirectoryView({
  directory,
  directoryLoading,
}: {
  directory: ChapterDir[];
  directoryLoading: boolean;
}) {
  if (directoryLoading) {
    return <p className="py-4 text-center text-sm text-slate-400">Loading directory…</p>;
  }
  if (directory.length === 0) {
    return <p className="text-sm text-slate-400">No chapters in the directory yet.</p>;
  }
  return (
    <div className="space-y-3">
      {directory.map((ch) => (
        <div key={ch.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{ch.name}</p>
            {ch.is_integrated ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Integrated with CrewCore
              </span>
            ) : null}
          </div>
          {ch.recruitment_url ? (
            <a
              href={ch.recruitment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-slate-600 underline-offset-2 hover:underline"
            >
              Visit website →
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function MakeTheCallPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('entry');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ChapterResult | null>(null);
  const [resultView, setResultView] = useState<ResultView>('main');
  const [showResultDir, setShowResultDir] = useState(false);
  const [directory, setDirectory] = useState<ChapterDir[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  const setAnswer = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  // ── Save profile & get result ──────────────────────────────────────────────
  const saveAndRecommend = async (finalAnswers: Answers) => {
    setSaving(true);
    setSaveError(null);

    // Resolve afternoon location from work/home ZIP when type isn't varies/other
    const type = finalAnswers.afternoon_location_type;
    const resolvedWeekdayLocation =
      type === 'work' || type === 'school'
        ? finalAnswers.work_zip
        : type === 'home'
          ? finalAnswers.home_zip
          : finalAnswers.weekday_afternoon_location;

    const profile = {
      want_recommendation: finalAnswers.want_recommendation,
      afternoon_location_type: finalAnswers.afternoon_location_type || null,
      weekday_afternoon_location: resolvedWeekdayLocation || null,
      work_zip: finalAnswers.work_zip || null,
      home_zip: finalAnswers.home_zip || null,
      travel_minutes: finalAnswers.travel_minutes || null,
      weekdays: finalAnswers.weekdays.length ? finalAnswers.weekdays : null,
      willing_low_level: finalAnswers.willing_low_level || null,
      evening_location_type: finalAnswers.evening_location_type || null,
      evening_location: finalAnswers.evening_location || null,
      saturday_availability: finalAnswers.saturday_availability || null,
      experience: finalAnswers.experience || null,
      current_membership: finalAnswers.current_membership || null,
      transport_availability: finalAnswers.transport_availability || null,
      share_consent: finalAnswers.share_consent,
    };

    const { error: saveErr } = await (supabase as any).rpc('save_placement_profile', {
      p_token: token,
      p_profile: profile,
    });

    if (saveErr) {
      setSaveError(saveErr.message ?? 'Failed to save. Please try again.');
      setSaving(false);
      return;
    }

    const { data: recData, error: recErr } = await (supabase as any).rpc('recommend_chapter', {
      p_token: token,
    });

    if (recErr || !recData) {
      setSaveError(recErr?.message ?? 'Failed to get your recommendation. Please try again.');
      setSaving(false);
      return;
    }

    setResult(recData as ChapterResult);
    setSaving(false);
    setPhase('result');
    setResultView('main');
    setShowResultDir(false);
  };

  const loadDirectory = async () => {
    if (directory.length > 0) return;
    setDirectoryLoading(true);
    const { data } = await (supabase as any).rpc('list_chapters_directory', {});
    setDirectory((data ?? []) as ChapterDir[]);
    setDirectoryLoading(false);
  };

  const handleConfirmAndContinue = async () => {
    if (!result) return;
    setConfirming(true);
    await (supabase as any).rpc('confirm_placement', {
      p_token: token,
      p_chapter_id: result.primary.chapter_id,
    });
    navigate(`/r/${token}`);
  };

  const handleRequestReview = async () => {
    setReviewBusy(true);
    await (supabase as any).rpc('request_chapter_review', {
      p_token: token,
      p_reason: reviewReason || null,
    });
    setReviewBusy(false);
    setReviewDone(true);
  };

  // ── Entry path handlers ────────────────────────────────────────────────────
  const handleGuided = () => {
    setAnswers((prev) => ({ ...prev, want_recommendation: 'recommend' }));
    setPhase('questions');
    setQuestionIdx(0);
  };

  const handleCompareEntry = () => {
    setAnswers((prev) => ({ ...prev, want_recommendation: 'compare' }));
    setPhase('compare');
    loadDirectory();
  };

  // ── Question navigation ────────────────────────────────────────────────────
  const visibleQuestions = computeVisibleQuestions(answers);
  const q = visibleQuestions[questionIdx];
  const isLast = questionIdx === visibleQuestions.length - 1;

  const canProceed = (): boolean => {
    if (!q || !q.required) return true;
    const val = answers[q.id];
    if (q.type === 'weekdays') return Array.isArray(val) && (val as string[]).length > 0;
    return typeof val === 'string' && (val as string).trim() !== '';
  };

  const advanceQuestion = async (skipCurrent = false) => {
    if (isLast) {
      await saveAndRecommend(answers);
    } else {
      setQuestionIdx((i) => i + 1);
    }
    void skipCurrent;
  };

  const goBack = () => {
    if (questionIdx === 0) {
      setPhase('entry');
    } else {
      setQuestionIdx((i) => i - 1);
    }
  };

  // ── Render question input ──────────────────────────────────────────────────
  const renderInput = () => {
    if (!q) return null;

    const singleChoice = (opts: { v: string; l: string }[], field: keyof Answers) => {
      const val = answers[field] as string;
      return (
        <div className="flex flex-col gap-2">
          {opts.map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => setAnswer(field, v)}
              className={choiceBtnCls(val === v)}
            >
              {l}
            </button>
          ))}
        </div>
      );
    };

    if (q.type === 'afternoon-type') return singleChoice(AFTERNOON_OPTS, 'afternoon_location_type');

    if (q.type === 'zip') {
      const field = q.id as 'weekday_afternoon_location' | 'work_zip' | 'home_zip';
      return (
        <input
          type="text"
          inputMode="numeric"
          value={answers[field]}
          onChange={(e) => setAnswer(field, e.target.value)}
          placeholder={q.placeholder ?? 'ZIP or nearest intersection'}
          className={inputCls}
          autoComplete="postal-code"
        />
      );
    }

    if (q.type === 'travel') {
      const opts = [
        { v: '15', l: '15 min' },
        { v: '30', l: '30 min' },
        { v: '45', l: '45 min' },
        { v: '60', l: '60+ min' },
      ];
      const val = answers.travel_minutes;
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {opts.map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => setAnswer('travel_minutes', v)}
              className={choiceBtnCls(val === v)}
            >
              {l}
            </button>
          ))}
        </div>
      );
    }

    if (q.type === 'weekdays') {
      const selected = answers.weekdays;
      return (
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_OPTS.map(({ v, l }) => {
            const on = selected.includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() =>
                  setAnswer('weekdays', on ? selected.filter((x) => x !== v) : [...selected, v])
                }
                className={[
                  'rounded-xl border px-5 py-3 text-sm font-semibold transition',
                  on
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                ].join(' ')}
              >
                {l}
              </button>
            );
          })}
        </div>
      );
    }

    if (q.type === 'willing')
      return singleChoice(
        [
          { v: 'yes', l: 'Yes' },
          { v: 'maybe', l: 'Maybe — open to it' },
          { v: 'no', l: "No — I'm targeting varsity" },
        ],
        'willing_low_level',
      );

    if (q.type === 'evening') {
      const typeVal = answers.evening_location_type;
      const needsZip = typeVal && typeVal !== 'home';
      return (
        <div className="flex flex-col gap-3">
          {singleChoice(EVENING_OPTS, 'evening_location_type')}
          {needsZip ? (
            <input
              type="text"
              inputMode="numeric"
              value={answers.evening_location}
              onChange={(e) => setAnswer('evening_location', e.target.value)}
              placeholder="ZIP or nearest intersection"
              className={inputCls}
              autoComplete="postal-code"
            />
          ) : null}
        </div>
      );
    }

    if (q.type === 'saturday')
      return singleChoice(
        [
          { v: 'yes', l: 'Yes' },
          { v: 'sometimes', l: 'Sometimes' },
          { v: 'no', l: 'No' },
        ],
        'saturday_availability',
      );

    if (q.type === 'experience')
      return singleChoice(
        [
          { v: 'none', l: 'None' },
          { v: 'youth', l: 'Youth / rec leagues' },
          { v: 'school', l: 'School level' },
          { v: 'college', l: 'College level' },
          { v: 'other', l: 'Other' },
        ],
        'experience',
      );

    if (q.type === 'membership')
      return singleChoice(
        [
          { v: 'yes', l: 'Yes — currently a member' },
          { v: 'no', l: 'No — starting fresh' },
          { v: 'previously', l: 'Previously — not currently' },
        ],
        'current_membership',
      );

    if (q.type === 'transport')
      return singleChoice(
        [
          { v: 'yes', l: 'Yes — reliable transportation' },
          { v: 'most', l: 'Most of the time' },
          { v: 'assistance', l: 'I may need assistance' },
        ],
        'transport_availability',
      );

    return null;
  };

  // ── Shell group label ──────────────────────────────────────────────────────
  const groupLabel = phase === 'questions' && q ? GROUP_LABELS[q.group] : '';

  // ── ENTRY SCREEN ───────────────────────────────────────────────────────────
  if (phase === 'entry') {
    return (
      <Shell groupLabel="">
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-3xl font-bold text-slate-900">Make the Call.</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Would you like CrewCore to recommend a chapter, or would you prefer to browse chapters
            yourself?
          </p>
          <p className="mt-2 text-sm text-slate-400">Takes about 2 minutes.</p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleGuided}
              className="w-full rounded-2xl bg-slate-900 px-4 py-4 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Make the Call for me
              <span className="ml-2 text-slate-400">→</span>
            </button>
            <button
              type="button"
              onClick={handleCompareEntry}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Let me compare chapters
            </button>
            <button
              type="button"
              onClick={() => navigate(`/r/${token}`)}
              className="mt-1 w-full bg-transparent px-4 py-2 text-sm text-slate-500 transition hover:text-slate-800"
            >
              Back to my checklist
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── COMPARE SCREEN (entry-path) ────────────────────────────────────────────
  if (phase === 'compare') {
    return (
      <Shell groupLabel="">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Browse chapters</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              DBOA is the only chapter currently integrated with CrewCore. More are coming.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPhase('entry')}
            className="shrink-0 text-sm font-semibold text-slate-400 hover:text-slate-600"
          >
            ← Back
          </button>
        </div>

        <DirectoryView directory={directory} directoryLoading={directoryLoading} />

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Want a recommendation instead?</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Answer a few questions and we&apos;ll tell you which chapter fits best.
          </p>
          <button
            type="button"
            onClick={() => {
              setAnswers((prev) => ({ ...prev, want_recommendation: 'recommend' }));
              setPhase('questions');
              setQuestionIdx(0);
            }}
            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            Get a recommendation
          </button>
        </div>
      </Shell>
    );
  }

  // ── QUESTION SCREEN ────────────────────────────────────────────────────────
  if (phase === 'questions') {
    const currentGroup = q?.group ?? 0;
    const currentStep = currentGroup;

    return (
      <Shell groupLabel={groupLabel}>
        {/* Progress indicator */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>
              Step {currentStep + 1} of 3 ·{' '}
              <span className="font-semibold text-slate-600">{GROUP_LABELS[currentGroup]}</span>
            </span>
            <span>{q?.sublabel}</span>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((seg) => (
              <div
                key={seg}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  seg < currentStep
                    ? 'bg-slate-900'
                    : seg === currentStep
                      ? 'bg-slate-400'
                      : 'bg-slate-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Two-column on lg, stacked on mobile */}
        <div className="flex flex-1 flex-col lg:flex-row lg:gap-10">
          {/* Left: question + answer */}
          <div className="flex flex-1 flex-col">
            <h2 className="text-lg font-semibold leading-snug text-slate-900">{q?.label}</h2>
            {q?.helper ? (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{q.helper}</p>
            ) : null}
            {!q?.required ? (
              <p className="mt-0.5 text-xs text-slate-400">Optional — you can skip this.</p>
            ) : null}

            <div className="mt-5">{renderInput()}</div>

            {q?.locationNote ? (
              <p className="mt-3 text-xs leading-relaxed text-slate-400">{LOCATION_NOTE}</p>
            ) : null}

            {/* Mobile: why we ask */}
            {q?.whyWeAsk ? (
              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 lg:hidden">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Why we ask
                </p>
                <p className="text-sm leading-relaxed text-slate-600">{q.whyWeAsk}</p>
              </div>
            ) : null}

            {saveError ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {saveError}
              </p>
            ) : null}

            <div className="mt-auto flex flex-col gap-2.5 pt-8">
              <button
                type="button"
                disabled={!canProceed() || saving}
                onClick={() => advanceQuestion(false)}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {saving ? 'Finding your match…' : isLast ? 'See the Call' : 'Next'}
              </button>

              {!q?.required ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => advanceQuestion(true)}
                  className="w-full py-2 text-sm text-slate-400 transition hover:text-slate-600"
                >
                  Skip for now.
                </button>
              ) : null}

              <button
                type="button"
                onClick={goBack}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Back
              </button>
            </div>
          </div>

          {/* Right: why we ask + illustration (desktop only) */}
          <aside className="hidden w-64 shrink-0 lg:block">
            {q?.whyWeAsk ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Why we ask
                </p>
                <p className="text-sm leading-relaxed text-slate-600">{q.whyWeAsk}</p>
              </div>
            ) : null}
            <RouteMap />
          </aside>
        </div>
      </Shell>
    );
  }

  // ── RESULT SCREEN ──────────────────────────────────────────────────────────
  if (!result) {
    return (
      <Shell groupLabel="">
        <p className="text-sm text-slate-400">Loading your recommendation…</p>
      </Shell>
    );
  }

  if (resultView === 'review') {
    return (
      <Shell groupLabel="">
        <button
          type="button"
          onClick={() => setResultView('main')}
          className="mb-4 flex items-center gap-1.5 bg-transparent p-0 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to The Call
        </button>
        <h2 className="text-xl font-bold text-slate-900">Request human review</h2>
        <p className="mt-1 text-sm text-slate-500">
          A CrewCore coordinator will review your situation and follow up directly.
        </p>
        {reviewDone ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5">
            <p className="text-sm font-semibold text-emerald-800">Request submitted.</p>
            <p className="mt-1 text-xs text-emerald-700">A coordinator will reach out soon.</p>
          </div>
        ) : (
          <>
            <textarea
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              placeholder="Anything you'd like to share (optional)"
              rows={4}
              className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
            <button
              type="button"
              disabled={reviewBusy}
              onClick={handleRequestReview}
              className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {reviewBusy ? 'Submitting…' : 'Submit request'}
            </button>
          </>
        )}
      </Shell>
    );
  }

  // Main result view
  return (
    <Shell groupLabel="">
      {/* Step 3 of 3 indicator */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>
            Step 3 of 3 · <span className="font-semibold text-slate-600">The Call</span>
          </span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((seg) => (
            <div key={seg} className="h-1.5 flex-1 rounded-full bg-slate-900" />
          ))}
        </div>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">The Call.</h1>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-base font-semibold text-slate-900">
          Your best initial fit may be {result.primary.name}.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{result.primary.reason}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-xs leading-relaxed text-amber-800">{result.disclaimer}</p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          disabled={confirming}
          onClick={handleConfirmAndContinue}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {confirming ? 'Confirming…' : `Continue with ${result.primary.name}`}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowResultDir((v) => !v);
            loadDirectory();
          }}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {showResultDir ? 'Hide other chapters ↑' : 'Compare other chapters'}
        </button>
        <button
          type="button"
          onClick={() => setResultView('review')}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Request human review
        </button>
      </div>

      {showResultDir ? (
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-slate-700">Other chapters</p>
          <p className="mb-3 text-xs text-slate-500">
            DBOA is the only chapter currently integrated with CrewCore. More Metroplex chapters are
            being added.
          </p>
          <DirectoryView directory={directory} directoryLoading={directoryLoading} />
        </div>
      ) : null}
    </Shell>
  );
}
