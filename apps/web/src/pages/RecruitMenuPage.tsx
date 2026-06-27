import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

type RegistrationStep = {
  step_id: string;
  name: string;
  description: string | null;
  status: 'locked' | 'available' | 'complete';
  completion_mode: 'self_report' | 'staff_verify' | 'locked';
  config: {
    cost?: string | null;
    links?: string[] | null;
    dates?: string | null;
  } | null;
  sort_order: number;
  evidence_url: string | null;
  data: Record<string, unknown> | null;
};

type RegistrationResponse = {
  token: string;
  chapter_id: string;
  sport_id: string;
  email: string;
  full_name?: string | null;
  steps: RegistrationStep[];
};

export default function RecruitMenuPage() {
  const { token } = useParams();
  const [registration, setRegistration] = useState<RegistrationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const [showCompletedSteps, setShowCompletedSteps] = useState(false);
  const [assessmentScores, setAssessmentScores] = useState<Record<string, string>>({});
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;

    const fetchRegistration = async () => {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_registration', { p_token: token });

      if (rpcError || !data) {
        setError('Unable to load your registration journey. Please check the link or try again.');
        setLoading(false);
        return;
      }

      setRegistration(data as RegistrationResponse);
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

    setRegistration(data as RegistrationResponse);
    setBusyStep(null);
  };

  const renderStepAction = (step: RegistrationStep) => {
    const scoreValue = assessmentScores[step.step_id] ?? '';
    const isAssessment = step.name.toLowerCase().includes('assessment');
    const score = parseInt(scoreValue, 10);

    if (step.status === 'available' && step.completion_mode === 'self_report') {
      if (isAssessment) {
        const invalidScore = Number.isNaN(score) || score < 0 || score > 100;
        const canSubmit = !invalidScore && score >= 70;
        return (
          <div className="assessment-block">
            <label>
              Assessment score
              <input
                type="number"
                min="0"
                max="100"
                value={scoreValue}
                onChange={(event) =>
                  setAssessmentScores((prev) => ({ ...prev, [step.step_id]: event.target.value }))
                }
                placeholder="Enter score (0-100)"
              />
            </label>
            {stepErrors[step.step_id] ? <p className="microcopy error-card">{stepErrors[step.step_id]}</p> : null}
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
            >
              {busyStep === step.step_id ? 'Submitting…' : 'Submit score'}
            </button>
          </div>
        );
      }

      return (
        <button type="button" onClick={() => handleCompleteStep(step.step_id)} disabled={busyStep === step.step_id}>
          {busyStep === step.step_id ? 'Marking done…' : 'Mark done'}
        </button>
      );
    }

    if (step.status === 'available' && step.completion_mode === 'staff_verify') {
      return <p className="microcopy">Your chapter handles this step and will confirm when it is complete.</p>;
    }

    if (step.status === 'locked') {
      return <p className="microcopy">Finish the previous step first to unlock this one.</p>;
    }

    if (step.status === 'complete') {
      return <p className="microcopy success-card">Step completed.</p>;
    }

    return null;
  };

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Recruit registration</h1>
          <p className="page-intro">Track your self-serve registration journey for DBOA Basketball.</p>
        </div>
      </div>

      {loading ? (
        <section className="card status-card">
          <p>Loading your registration…</p>
        </section>
      ) : error ? (
        <section className="card status-card error-card">
          <p>{error}</p>
        </section>
      ) : registration ? (
        <section className="card">
          <div className="page-title">
            <div>
              <h2>Welcome back, {registration.full_name || registration.email || 'recruit'}.</h2>
              <p className="microcopy">Follow the steps below to complete your onboarding journey.</p>
            </div>
          </div>

          {registration.steps.length > 0 ? (
            <>
              {(() => {
                const steps = registration.steps.slice().sort((a, b) => a.sort_order - b.sort_order);
                const completedSteps = steps.filter((step) => step.status === 'complete');
                const progressPercent = Math.round((completedSteps.length / steps.length) * 100);
                const nextStep = steps.find((step) => step.status === 'available');

                return (
                  <>
                    <div className="timeline-summary">
                      <div className="timeline-progress">
                        <strong>{progressPercent}% complete</strong>
                        <div className="progress-meter">
                          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>
                      <p className="microcopy">
                        {completedSteps.length} of {steps.length} steps finished.
                      </p>
                    </div>

                    {completedSteps.length > 0 ? (
                      <div className="completed-summary">
                        <span>{completedSteps.length} completed steps</span>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setShowCompletedSteps((value) => !value)}
                        >
                          {showCompletedSteps ? 'Hide completed details' : 'Show completed details'}
                        </button>
                      </div>
                    ) : null}

                    {steps.length === completedSteps.length ? (
                      <div className="success-card">
                        <h3>All done!</h3>
                        <p>You have completed every step in the registration workflow.</p>
                      </div>
                    ) : null}

                    <div className="timeline-list">
                      {registration.steps
                        .slice()
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .filter((step) => showCompletedSteps || step.status !== 'complete')
                        .map((step) => (
                          <article
                            key={step.step_id}
                            className={`timeline-step ${step.status} ${step.step_id === nextStep?.step_id ? 'next-step' : ''}`}
                          >
                            <div className="timeline-marker">
                              <div className="marker-number">{step.sort_order}</div>
                              <div className={`status-badge ${step.status}`}>
                                {step.status === 'complete'
                                  ? 'Completed'
                                  : step.status === 'available'
                                  ? 'Ready'
                                  : 'Locked'}
                              </div>
                            </div>
                            <div className="timeline-card">
                              <div className="step-header">
                                <div>
                                  <h3>{step.name}</h3>
                                  {step.status === 'available' && step.step_id === nextStep?.step_id ? (
                                    <span className="next-chip">Do this next</span>
                                  ) : null}
                                </div>
                                <div className="step-status-pill">
                                  <span>{step.completion_mode.replace('_', ' ')}</span>
                                </div>
                              </div>

                              {step.description ? <p>{step.description}</p> : null}
                              {step.config?.cost ? (
                                <div className="step-meta">
                                  <strong>Cost:</strong> {step.config.cost}
                                </div>
                              ) : null}
                              {step.config?.dates ? (
                                <div className="step-meta">
                                  <strong>Dates:</strong> {step.config.dates}
                                </div>
                              ) : null}
                              {step.config?.links?.length ? (
                                <div className="step-meta">
                                  <strong>Links:</strong>
                                  <ul>
                                    {step.config.links.map((link) => (
                                      <li key={link}>
                                        <a href={link} target="_blank" rel="noreferrer">
                                          {link}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              <div className="step-actions">
                                {renderStepAction(step)}
                              </div>
                            </div>
                          </article>
                        ))}
                    </div>
                  </>
                );
              })()}
            </>
          ) : (
            <p className="microcopy">No steps were found for this registration. Please contact your chapter for help.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
