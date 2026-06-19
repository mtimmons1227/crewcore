import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

type LeadRow = {
  id: string;
  stage: string;
  created_at: string;
  person: {
    full_name: string;
    email: string;
    phone: string;
  } | null;
  sport: {
    name: string;
  } | null;
};

type AuthState = 'login' | 'signup';

export default function CommandCenterPage() {
  const [authMode, setAuthMode] = useState<AuthState>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<null | { user: { email: string | null } }>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
      setLeads([]);
      return;
    }

    const fetchLeads = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from<'lead', LeadRow>('lead')
        .select('*, person:person_id(full_name,email,phone), sport:sport_id(name)')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError('Unable to load leads. Please try again.');
        setLoading(false);
        return;
      }

      setLeads(data ?? []);
      setLoading(false);
    };

    fetchLeads();
  }, [session]);

  const handleSignIn = async () => {
    setFormError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setFormError(signInError.message);
    }

    setLoading(false);
  };

  const handleSignUp = async () => {
    setFormError(null);
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setFormError(signUpError.message);
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setLeads([]);
  };

  const header = (
    <div className="page-title">
      <div>
        <h1>Command Center</h1>
        <p className="page-intro">Manage your chapter’s new leads and track initial recruiting interest.</p>
      </div>
      {session ? (
        <div className="user-pill">
          {session.user.email ?? 'Unknown user'}
          <button type="button" onClick={handleSignOut} style={{ marginLeft: '12px' }}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );

  const authCard = (
    <section className="card auth-card">
      <div className="command-header">
        <div>
          <h2>{authMode === 'login' ? 'Sign in' : 'Create an account'}</h2>
          <p>Enter your staff email and password to access the Command Center.</p>
        </div>
      </div>

      <label>
        Email address
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
        />
      </label>

      {formError ? <p className="microcopy error-card">{formError}</p> : null}

      <div className="cta-row">
        <button type="button" onClick={authMode === 'login' ? handleSignIn : handleSignUp} disabled={loading}>
          {loading ? 'Working...' : authMode === 'login' ? 'Sign in' : 'Sign up'}
        </button>
      </div>

      <p className="login-toggle">
        {authMode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
        <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
          {authMode === 'login' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </section>
  );

  const leadsContent = (
    <section className="card lead-card">
      {loading ? (
        <p>Loading your chapter leads…</p>
      ) : leads.length === 0 ? (
        <div className="lead-empty">
          <h3>No leads yet</h3>
          <p>Your chapter has not received any new leads yet. Check back soon for new interest.</p>
        </div>
      ) : (
        <div className="lead-grid">
          {leads.map((lead) => (
            <article className="lead-card" key={lead.id}>
              <h2>{lead.person?.full_name ?? 'Unknown lead'}</h2>
              <div className="lead-field">
                <span>Email</span>
                <span>{lead.person?.email ?? '—'}</span>
              </div>
              <div className="lead-field">
                <span>Phone</span>
                <span>{lead.person?.phone ?? '—'}</span>
              </div>
              <div className="lead-field">
                <span>Sport</span>
                <span>{lead.sport?.name ?? '—'}</span>
              </div>
              <div className="lead-field">
                <span>Stage</span>
                <span>{lead.stage}</span>
              </div>
              <div className="lead-field">
                <span>Received</span>
                <span>{new Date(lead.created_at).toLocaleString()}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div>
      {header}
      {initializing ? (
        <section className="card status-card">
          <p>Checking auth status…</p>
        </section>
      ) : session ? (
        leadsContent
      ) : (
        authCard
      )}
    </div>
  );
}
