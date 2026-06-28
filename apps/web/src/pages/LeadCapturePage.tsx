import { useEffect, useState } from 'react';
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
};

type LeadFormState = {
  fullName: string;
  phone: string;
  email: string;
};

const DBOA_CHAPTER_SLUG = 'DBOA';
const BASKETBALL_SPORT_NAME = 'Basketball';

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400';
const labelCls = 'mb-4 block text-sm font-semibold text-slate-700';
const primaryBtn =
  'w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70';

export default function LeadCapturePage() {
  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [sport, setSport] = useState<SportRow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [form, setForm] = useState<LeadFormState>({ fullName: '', phone: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);

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
        .select('id,name,sort_order,step_type,cadence,required,completion_mode,config,prerequisite_step_id')
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

  const isFormValid = form.fullName.trim() && form.phone.trim() && form.email.trim();

  const handleChange = (key: keyof LeadFormState, value: string) =>
    setForm((cur) => ({ ...cur, [key]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sport || !chapter) return;
    setSaving(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc('submit_lead', {
      p_chapter_id: chapter.id,
      p_full_name: form.fullName.trim(),
      p_phone: form.phone.trim(),
      p_email: form.email.trim(),
      p_sport_id: sport.id,
      p_source: 'public-lead-capture',
    });

    if (rpcError) {
      setError('Unable to submit your interest. Please try again.');
      setSaving(false);
      return;
    }

    setSubmitted(true);
    setSaving(false);
  };

  const handleStartRegistration = async () => {
    if (!sport || !chapter || !form.email.trim()) return;
    setRegistrationLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('start_registration', {
      p_email: form.email.trim(),
      p_chapter_id: chapter.id,
      p_sport_id: sport.id,
    });

    if (rpcError || !data) {
      setError('Unable to start registration right now. Please try again.');
      setRegistrationLoading(false);
      return;
    }

    const registrationToken = data as string;
    window.localStorage.setItem('recruit_registration_token', registrationToken);
    window.location.href = `/r/${registrationToken}`;
  };

  const chapterName = chapter?.name ?? 'DBOA';

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
            CrewCore Recruit
          </div>
          <div className="text-xl font-semibold">{chapterName}</div>
          <div className="mt-1 text-sm text-slate-400">
            {chapter?.tagline ?? 'Start your officiating journey'}
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <div>
      {header}

      {loading ? (
        <Card className="mt-6 p-6">
          <p className="text-sm text-slate-500">Loading chapter info…</p>
        </Card>
      ) : error && !submitted ? (
        <Card className="mt-6 p-6">
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        </Card>
      ) : submitted ? (
        <>
          <Card className="mt-6 p-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Thank you, {form.fullName.split(' ')[0] ?? 'there'}!
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Your interest has been sent to {chapterName}. A recruiter will reach out soon with next steps.
            </p>
          </Card>

          <Card className="mt-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900">What to expect next</h3>
            <p className="mt-1 text-sm text-slate-500">
              Self-serve registration journey for {chapterName} Basketball.
            </p>
            {steps.length > 0 ? (
              <ol className="mt-4 space-y-2">
                {steps.map((step, i) => (
                  <li
                    key={step.id}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{step.name}</div>
                      {step.description ? (
                        <div className="mt-0.5 text-slate-500">{step.description}</div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleStartRegistration}
                disabled={registrationLoading}
                className={primaryBtn}
              >
                {registrationLoading ? 'Starting registration…' : 'Start my registration'}
              </button>
            </div>
          </Card>
        </>
      ) : (
        <Card className="mt-6 p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900">Express your interest</h2>
            <p className="mt-1 text-sm text-slate-500">
              Quick interest form — {chapterName} will follow up with next steps.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label className={labelCls}>
              <span className="mb-2 block">Full name</span>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Jane Doe"
                required
                className={inputCls}
              />
            </label>

            <label className={labelCls}>
              <span className="mb-2 block">Phone number</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                required
                className={inputCls}
              />
            </label>

            <label className={labelCls}>
              <span className="mb-2 block">Email address</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="you@example.com"
                required
                className={inputCls}
              />
            </label>

            {error ? (
              <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex items-center gap-3">
              <button type="submit" disabled={!isFormValid || saving} className={primaryBtn}>
                {saving ? 'Sending…' : 'Send interest'}
              </button>
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                {sport?.name ?? 'Basketball'}
              </span>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              No account needed. {chapterName} will only use your contact info to follow up about officiating.
            </p>
          </form>
        </Card>
      )}
    </div>
  );
}
