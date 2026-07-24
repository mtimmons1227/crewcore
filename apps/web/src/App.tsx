import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LeadCapturePage from './pages/LeadCapturePage';
import CommandCenterPage from './pages/CommandCenterPage';
import RecruitMenuPage from './pages/RecruitMenuPage';
import { startDomainEventConsumer, stopDomainEventConsumer } from './lib/domainEvents';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-rose-700">Something went wrong.</p>
            <p className="mt-1 text-sm text-slate-500">
              Please refresh the page. If the problem persists, contact support.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const location = useLocation();

  useEffect(() => {
    startDomainEventConsumer();
    return () => stopDomainEventConsumer();
  }, []);

  const isCommandCenter = location.pathname === '/command';
  const isLeadCapture = location.pathname === '/';

  const shellClass = isCommandCenter || isLeadCapture ? 'min-h-screen bg-slate-100' : 'page-shell';
  const frameClass = isCommandCenter
    ? 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'
    : isLeadCapture
      ? 'mx-auto w-full max-w-lg px-4 py-6 sm:px-6'
      : 'frame';

  return (
    <ErrorBoundary>
      <div className={shellClass}>
        <div className={frameClass}>
          <Routes>
            <Route path="/" element={<LeadCapturePage />} />
            <Route path="/command" element={<CommandCenterPage />} />
            <Route path="/r/:token" element={<RecruitMenuPage />} />
          </Routes>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
