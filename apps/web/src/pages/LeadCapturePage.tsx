import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

type ChapterRow = {
  id: string;
  name: string;
  tagline: string | null;
  hero_text: string | null;
  accent_color: string | null;
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

export default function LeadCapturePage() {
  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [sport, setSport] = useState<SportRow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [form, setForm] = useState<LeadFormState>({ fullName: '', phone: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      const chapterResult = await supabase
        .from('chapter')
        .select('id,name,tagline,hero_text,accent_color')
        .eq('slug', DBOA_CHAPTER_SLUG)
        .single();

      const chapterData = chapterResult.data as ChapterRow | null;
      const chapterError = chapterResult.error;

      if (chapterError || !chapterData) {
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
      const sportError = sportResult.error;

      if (sportError || !sportData) {
        setError('Unable to load sport information.');
        setLoading(false);
        return;
      }

      const workflowResult = await supabase
        .from('workflow_step')
        .select(
          'id,name,sort_order,step_type,cadence,required,completion_mode,config,prerequisite_step_id',
        )
        .eq('chapter_id', chapterData.id)
        .eq('sport_id', sportData.id)
        .order('sort_order', { ascending: true });

      const workflowData = workflowResult.data as WorkflowStep[] | null;
      const workflowError = workflowResult.error;

      if (workflowError) {
        setError('Unable to load the registration preview.');
      }

      setChapter(chapterData);
      setSport(sportData);
      setSteps(workflowData ?? []);
      setLoading(false);
    }

    const storedToken = window.localStorage.getItem('recruit_registration_token');
    if (storedToken) {
      setToken(storedToken);
    }

    loadData();
  }, []);

  const accentStyle = useMemo(
    () => ({
      '--accent': chapter?.accent_color ?? '#009688',
    } as React.CSSProperties),
    [chapter],
  );

  const isFormValid = form.fullName.trim() && form.phone.trim() && form.email.trim();

  const handleChange = (key: keyof LeadFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

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
    setToken(registrationToken);
    window.location.href = `/r/${registrationToken}`;
  };

  return (
    <div className="hero" style={accentStyle}>
      <div className="hero-badge">DBOA Recruiting</div>
      <h1>{chapter?.name ?? 'DBOA'} is looking for new officials</h1>
      <p>{chapter?.tagline ?? 'Start officiating basketball with a chapter-led onboarding path.'}</p>
      <div className="progress-pill">Step 1 of 1 — quick interest form</div>

      {loading ? (
        <section className="card status-card">
          <p>Loading chapter info...</p>
        </section>
      ) : error ? (
        <section className="card status-card error-card">
          <p>{error}</p>
        </section>
      ) : submitted ? (
        <>
          <section className="card success-card">
            <h2>Thank you, {form.fullName.split(' ')[0] ?? 'there'}!</h2>
            <p>Your interest has been sent to DBOA. A recruiter will reach out soon with next steps.</p>
            <p className="microcopy">If you want to review your info, refresh the page to submit another lead.</p>
          </section>

          <section className="card">
            <h3>What to expect next</h3>
            <p className="microcopy">This is the self-serve recruit journey for DBOA Basketball.</p>
            {steps.length > 0 ? (
              <ol className="workflow-list">
                {steps.map((step) => (
                  <li key={step.id}>
                    <strong>{step.name}</strong>
                    {step.description ? <p>{step.description}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="microcopy">Loading the registration journey…</p>
            )}
            <div className="cta-row">
              <button type="button" onClick={handleStartRegistration} disabled={registrationLoading}>
                {registrationLoading ? 'Starting registration…' : 'Start my registration'}
              </button>
            </div>
          </section>
        </>
      ) : (
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="form-step">
            <p className="step-label">Tell us who you are</p>
            <label>
              Full name
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => handleChange('fullName', event.target.value)}
                placeholder="Jane Doe"
                required
              />
            </label>
            <label>
              Phone number
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                placeholder="(555) 123-4567"
                required
              />
            </label>
            <label>
              Email address
              <input
                type="email"
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
          </div>

          <div className="cta-row">
            <button type="submit" disabled={!isFormValid || saving}>
              {saving ? 'Sending...' : 'Send interest'}
            </button>
            <span className="sport-chip">Sport: {sport?.name ?? 'Basketball'}</span>
          </div>

          <p className="microcopy">
            This is a no-account form. DBOA will only use your contact info to follow up about officiating.
          </p>
        </form>
      )}
    </div>
  );
}
