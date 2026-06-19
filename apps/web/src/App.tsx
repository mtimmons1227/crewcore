import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

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

type LeadFormState = {
  fullName: string;
  phone: string;
  email: string;
};

const DBOA_CHAPTER_SLUG = 'DBOA';
const BASKETBALL_SPORT_NAME = 'Basketball';

function App() {
  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [sport, setSport] = useState<SportRow | null>(null);
  const [form, setForm] = useState<LeadFormState>({ fullName: '', phone: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      const { data: chapterData, error: chapterError } = await supabase
        .from<ChapterRow>('chapter')
        .select('id,name,tagline,hero_text,accent_color')
        .eq('slug', DBOA_CHAPTER_SLUG)
        .single();

      if (chapterError || !chapterData) {
        setError('Unable to load chapter information.');
        setLoading(false);
        return;
      }

      const { data: sportData, error: sportError } = await supabase
        .from<SportRow>('sport')
        .select('id,name')
        .eq('name', BASKETBALL_SPORT_NAME)
        .single();

      if (sportError || !sportData) {
        setError('Unable to load sport information.');
        setLoading(false);
        return;
      }

      setChapter(chapterData);
      setSport(sportData);
      setLoading(false);
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

  return (
    <div className="page-shell" style={accentStyle}>
      <div className="frame">
        <header className="hero">
          <div className="hero-badge">DBOA Recruiting</div>
          <h1>{chapter?.name ?? 'DBOA'} is looking for new officials</h1>
          <p>{chapter?.tagline ?? 'Start officiating basketball with a chapter-led onboarding path.'}</p>
          <div className="progress-pill">Step 1 of 1 — quick interest form</div>
        </header>

        {loading ? (
          <section className="card status-card">
            <p>Loading chapter info...</p>
          </section>
        ) : error ? (
          <section className="card status-card error-card">
            <p>{error}</p>
          </section>
        ) : submitted ? (
          <section className="card success-card">
            <h2>Thank you, {form.fullName.split(' ')[0] ?? 'there'}!</h2>
            <p>Your interest has been sent to DBOA. A recruiter will reach out soon with next steps.</p>
            <p className="microcopy">If you want to review your info, refresh the page to submit another lead.</p>
          </section>
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
    </div>
  );
}

export default App;
