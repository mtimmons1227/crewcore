import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

type Answers = {
  weekday_afternoon_location: string;
  home_zip: string;
  work_zip: string;
  evening_location: string;
  travel_minutes: string;
  weekdays: string[];
  saturdays: boolean | null;
  experience: string;
  reliable_transport: boolean | null;
  chapter_preference: string;
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

type Question = {
  id: keyof Answers;
  category?: string;
  label: string;
  type: 'text' | 'number' | 'multiselect' | 'boolean' | 'select' | 'consent';
  optional?: boolean;
  options?: { value: string; label: string }[];
};

const WEEKDAY_OPTIONS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
];

const QUESTIONS: Question[] = [
  {
    id: 'weekday_afternoon_location',
    category: 'The Situation',
    label: 'Where are you normally located between 4:00 and 4:30 p.m. on weekdays?',
    type: 'text',
  },
  { id: 'home_zip', label: 'What is your home ZIP code?', type: 'text' },
  { id: 'work_zip', label: 'What is your work or school ZIP code?', type: 'text' },
  {
    id: 'evening_location',
    label: 'Where are you typically located around 6:00–6:30 p.m.?',
    type: 'text',
  },
  {
    id: 'travel_minutes',
    label: 'How many minutes are you willing to travel to a game (maximum)?',
    type: 'number',
  },
  {
    id: 'weekdays',
    label: 'Which weekdays are you generally available?',
    type: 'multiselect',
    options: WEEKDAY_OPTIONS,
  },
  { id: 'saturdays', label: 'Are Saturdays available for you?', type: 'boolean' },
  {
    id: 'experience',
    label: 'How would you describe your current officiating experience?',
    type: 'select',
    options: [
      { value: 'new', label: 'New to officiating' },
      { value: 'some', label: 'Some experience' },
      { value: 'experienced', label: 'Experienced official' },
    ],
  },
  { id: 'reliable_transport', label: 'Do you have reliable transportation?', type: 'boolean' },
  {
    id: 'chapter_preference',
    label: 'Do you have a chapter preference?',
    type: 'text',
    optional: true,
  },
  {
    id: 'share_consent',
    label:
      'Based on my location and availability, I authorize CrewCore to share my contact information with the basketball officials chapter I select or approve for referral.',
    type: 'consent',
  },
];

const INITIAL_ANSWERS: Answers = {
  weekday_afternoon_location: '',
  home_zip: '',
  work_zip: '',
  evening_location: '',
  travel_minutes: '',
  weekdays: [],
  saturdays: null,
  experience: '',
  reliable_transport: null,
  chapter_preference: '',
  share_consent: false,
};

export default function MakeTheCallPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'intro' | 'questions' | 'result'>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [result, setResult] = useState<ChapterResult | null>(null);
  const [resultView, setResultView] = useState<'main' | 'compare' | 'review'>('main');

  const [directory, setDirectory] = useState<ChapterDir[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);

  const [reviewReason, setReviewReason] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  const [referralBusy, setReferralBusy] = useState<Record<string, boolean>>({});
  const [referralResults, setReferralResults] = useState<Record<string, { ok: boolean; reason?: string }>>({});

  const q = QUESTIONS[currentQ];

  const setAnswer = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = (): boolean => {
    if (!q || q.optional) return true;
    const val = answers[q.id];
    if (q.type === 'boolean') return val !== null;
    if (q.type === 'multiselect') return Array.isArray(val) && (val as string[]).length > 0;
    if (q.type === 'consent') return val === true;
    if (q.type === 'select') return typeof val === 'string' && val !== '';
    return typeof val === 'string' && (val as string).trim() !== '';
  };

  const handleNext = async () => {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((c) => c + 1);
      return;
    }
    setSaving(true);
    setSaveError(null);

    const { error: saveErr } = await (supabase as any).rpc('save_placement_profile', {
      p_token: token,
      p_profile: {
        weekday_afternoon_location: answers.weekday_afternoon_location || null,
        home_zip: answers.home_zip || null,
        work_zip: answers.work_zip || null,
        evening_location: answers.evening_location || null,
        travel_minutes: answers.travel_minutes ? answers.travel_minutes : null,
        weekdays: answers.weekdays,
        saturdays: answers.saturdays,
        experience: answers.experience || null,
        reliable_transport: answers.reliable_transport,
        chapter_preference: answers.chapter_preference || null,
        share_consent: answers.share_consent,
      },
    });

    if (saveErr) {
      setSaveError(saveErr.message ?? 'Failed to save your answers. Please try again.');
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
  };

  const loadDirectory = async () => {
    setDirectoryLoading(true);
    const { data } = await (supabase as any).rpc('list_chapters_directory', {});
    setDirectory((data ?? []) as ChapterDir[]);
    setDirectoryLoading(false);
  };

  const handleCompare = () => {
    setResultView('compare');
    if (directory.length === 0) loadDirectory();
  };

  const handleRefer = async (chapterId: string) => {
    setReferralBusy((prev) => ({ ...prev, [chapterId]: true }));
    const { data, error } = await (supabase as any).rpc('create_referral', {
      p_token: token,
      p_chapter_id: chapterId,
      p_share_consent: answers.share_consent,
    });
    setReferralBusy((prev) => ({ ...prev, [chapterId]: false }));
    if (error) {
      setReferralResults((prev) => ({ ...prev, [chapterId]: { ok: false, reason: error.message } }));
    } else {
      setReferralResults((prev) => ({
        ...prev,
        [chapterId]: data as { ok: boolean; reason?: string },
      }));
    }
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

  const inputCls =
    'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400';

  const primaryBtn =
    'w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60';

  const secondaryBtn =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50';

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="bg-slate-900 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          CrewCore
        </p>
        <p className="mt-0.5 text-lg font-bold text-white">Make the Call.</p>
      </header>
      <div className="flex flex-1 flex-col px-5 py-7 sm:mx-auto sm:w-full sm:max-w-md">
        {children}
      </div>
    </div>
  );

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-3xl font-bold text-slate-900">Make the Call.</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Let&apos;s determine the most practical place to begin your officiating journey.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Answer {QUESTIONS.length} quick questions about where you are, when you&apos;re
            available, and your experience — and we&apos;ll match you to the right chapter.
          </p>
          <button
            type="button"
            onClick={() => setPhase('questions')}
            className={`mt-8 ${primaryBtn}`}
          >
            Start
          </button>
          <button
            type="button"
            onClick={() => navigate(`/r/${token}`)}
            className={`mt-3 ${secondaryBtn}`}
          >
            Back to my checklist
          </button>
        </div>
      </Shell>
    );
  }

  // ── Questions ──────────────────────────────────────────────────────────────
  if (phase === 'questions') {
    const progress = Math.round((currentQ / QUESTIONS.length) * 100);

    const renderInput = () => {
      if (!q) return null;

      if (q.type === 'text' || q.type === 'number') {
        return (
          <input
            type={q.type === 'number' ? 'number' : 'text'}
            value={answers[q.id] as string}
            onChange={(e) => setAnswer(q.id as 'travel_minutes', e.target.value)}
            placeholder={q.optional ? 'Optional — leave blank to skip' : ''}
            min={q.type === 'number' ? 0 : undefined}
            className={inputCls}
          />
        );
      }

      if (q.type === 'boolean') {
        const val = answers[q.id] as boolean | null;
        return (
          <div className="flex gap-3">
            {([{ label: 'Yes', v: true }, { label: 'No', v: false }] as const).map(({ label, v }) => (
              <button
                key={label}
                type="button"
                onClick={() => setAnswer(q.id as 'saturdays', v)}
                className="flex-1 rounded-2xl border py-3.5 text-sm font-semibold transition"
                style={{
                  backgroundColor: val === v ? '#0f172a' : 'white',
                  color: val === v ? 'white' : '#334155',
                  borderColor: val === v ? '#0f172a' : '#e2e8f0',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        );
      }

      if (q.type === 'select' && q.options) {
        const val = answers[q.id] as string;
        return (
          <div className="flex flex-col gap-2">
            {q.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAnswer(q.id as 'experience', opt.value)}
                className="rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition"
                style={{
                  backgroundColor: val === opt.value ? '#0f172a' : 'white',
                  color: val === opt.value ? 'white' : '#334155',
                  borderColor: val === opt.value ? '#0f172a' : '#e2e8f0',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      }

      if (q.type === 'multiselect') {
        const selected = answers.weekdays;
        return (
          <div className="flex flex-wrap gap-2">
            {(q.options ?? []).map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setAnswer(
                      'weekdays',
                      isSelected
                        ? selected.filter((v) => v !== opt.value)
                        : [...selected, opt.value],
                    )
                  }
                  className="rounded-xl border px-5 py-3 text-sm font-semibold transition"
                  style={{
                    backgroundColor: isSelected ? '#0f172a' : 'white',
                    color: isSelected ? 'white' : '#334155',
                    borderColor: isSelected ? '#0f172a' : '#e2e8f0',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        );
      }

      if (q.type === 'consent') {
        return (
          <button
            type="button"
            onClick={() => setAnswer('share_consent', !answers.share_consent)}
            className="flex items-start gap-3 rounded-2xl border p-4 text-left transition"
            style={{
              borderColor: answers.share_consent ? '#0f172a' : '#e2e8f0',
              backgroundColor: answers.share_consent ? '#f8fafc' : 'white',
            }}
          >
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition"
              style={{
                borderColor: answers.share_consent ? '#0f172a' : '#cbd5e1',
                backgroundColor: answers.share_consent ? '#0f172a' : 'white',
              }}
            >
              {answers.share_consent ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5l2.5 2.5L8 3"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <p className="text-sm leading-relaxed text-slate-700">{q.label}</p>
          </button>
        );
      }

      return null;
    };

    return (
      <Shell>
        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-1.5 flex justify-between text-xs text-slate-400">
            <span>
              Question {currentQ + 1} of {QUESTIONS.length}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {q?.category ? (
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
              {q.category}
            </p>
          ) : null}
          <h2 className="text-lg font-semibold leading-snug text-slate-900">{q?.label}</h2>
          {q?.optional ? (
            <p className="mt-1 text-xs text-slate-400">Optional — you can skip this.</p>
          ) : null}

          <div className="mt-5">{renderInput()}</div>

          {saveError ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              {saveError}
            </p>
          ) : null}

          <div className="mt-auto flex flex-col gap-3 pt-8">
            <button
              type="button"
              disabled={!canProceed() || saving}
              onClick={handleNext}
              className={primaryBtn}
            >
              {saving
                ? 'Finding your match…'
                : currentQ < QUESTIONS.length - 1
                  ? 'Next'
                  : 'See the Call'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentQ > 0) setCurrentQ((c) => c - 1);
                else setPhase('intro');
              }}
              className={secondaryBtn}
            >
              Back
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (!result) {
    return (
      <Shell>
        <p className="text-sm text-slate-400">Loading your recommendation…</p>
      </Shell>
    );
  }

  // Compare view
  if (resultView === 'compare') {
    return (
      <Shell>
        <button
          type="button"
          onClick={() => setResultView('main')}
          className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          ← Back to The Call
        </button>
        <h2 className="text-xl font-bold text-slate-900">Compare chapters</h2>
        <p className="mt-1 text-sm text-slate-500">
          DBOA is the chapter currently integrated with CrewCore. More Metroplex chapters are
          being added — honest note: only DBOA manages the full workflow here today.
        </p>

        {directoryLoading ? (
          <p className="mt-4 text-sm text-slate-400">Loading directory…</p>
        ) : (
          <div className="mt-4 space-y-3">
            {directory.map((ch) => {
              const ref = referralResults[ch.id];
              return (
                <div key={ch.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{ch.name}</p>
                      <p className="text-xs text-slate-500">{ch.region}</p>
                      {ch.coverage_note ? (
                        <p className="mt-1 text-xs text-slate-400">{ch.coverage_note}</p>
                      ) : null}
                    </div>
                    {ch.is_integrated ? (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Integrated
                      </span>
                    ) : null}
                  </div>

                  {!ch.is_integrated ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ch.recruitment_url ? (
                        <a
                          href={ch.recruitment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Visit website
                        </a>
                      ) : null}
                      {ch.contact_email ? (
                        <a
                          href={`mailto:${ch.contact_email}`}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Email chapter
                        </a>
                      ) : null}
                      {ref ? (
                        ref.ok ? (
                          <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            Referral sent ✓
                          </span>
                        ) : ref.reason === 'consent_required' ? (
                          <span className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                            Consent required — go back and check question 11
                          </span>
                        ) : (
                          <span className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
                            {ref.reason ?? 'Error sending referral'}
                          </span>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled={referralBusy[ch.id]}
                          onClick={() => handleRefer(ch.id)}
                          className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                        >
                          {referralBusy[ch.id] ? 'Sending…' : 'Refer me'}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {directory.length === 0 && !directoryLoading ? (
              <p className="text-sm text-slate-400">No additional chapters in the directory yet.</p>
            ) : null}
          </div>
        )}
      </Shell>
    );
  }

  // Human review view
  if (resultView === 'review') {
    return (
      <Shell>
        <button
          type="button"
          onClick={() => setResultView('main')}
          className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          ← Back to The Call
        </button>
        <h2 className="text-xl font-bold text-slate-900">Request human review</h2>
        <p className="mt-1 text-sm text-slate-500">
          A CrewCore coordinator will look at your situation and follow up directly.
        </p>

        {reviewDone ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5">
            <p className="text-sm font-semibold text-emerald-800">Request submitted.</p>
            <p className="mt-1 text-xs text-emerald-700">
              A coordinator will review and reach out soon.
            </p>
          </div>
        ) : (
          <>
            <textarea
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              placeholder="Anything you'd like to share about your situation (optional)"
              rows={4}
              className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
            <button
              type="button"
              disabled={reviewBusy}
              onClick={handleRequestReview}
              className={`mt-4 ${primaryBtn}`}
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
    <Shell>
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
          onClick={() => navigate(`/r/${token}`)}
          className={primaryBtn}
        >
          Continue with {result.primary.name}
        </button>
        <button type="button" onClick={handleCompare} className={secondaryBtn}>
          Compare other chapters
        </button>
        <button type="button" onClick={() => setResultView('review')} className={secondaryBtn}>
          Request human review
        </button>
      </div>
    </Shell>
  );
}
