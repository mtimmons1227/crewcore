import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LeadCapturePage from './pages/LeadCapturePage';
import CommandCenterPage from './pages/CommandCenterPage';
import RecruitMenuPage from './pages/RecruitMenuPage';
import BoardDashboardPage from './pages/BoardDashboardPage';
import CheckInPage from './pages/CheckInPage';
import KioskPage from './pages/KioskPage';
import SessionAdminPage from './pages/SessionAdminPage';
import BoardVerifyPage from './pages/BoardVerifyPage';
import MakeTheCallPage from './pages/MakeTheCallPage';
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
  const isBoard = location.pathname === '/board';
  const isLeadCapture = location.pathname === '/';
  const isFullBleed =
    location.pathname.startsWith('/checkin/') ||
    location.pathname.startsWith('/kiosk/') ||
    location.pathname === '/sessions/admin' ||
    location.pathname === '/board/verify' ||
    location.pathname.endsWith('/make-the-call');

  const shellClass = isFullBleed
    ? ''
    : isCommandCenter || isBoard || isLeadCapture
      ? 'min-h-screen bg-slate-100'
      : 'page-shell';
  const frameClass = isFullBleed
    ? ''
    : isCommandCenter || isBoard
      ? 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'
      : isLeadCapture
        ? 'mx-auto w-full max-w-5xl px-4 py-6 sm:px-6'
        : 'frame';

  return (
    <ErrorBoundary>
      <div className={shellClass}>
        <div className={frameClass}>
          <Routes>
            <Route path="/" element={<LeadCapturePage />} />
            <Route path="/command" element={<CommandCenterPage />} />
            <Route path="/board" element={<BoardDashboardPage />} />
            <Route path="/r/:token/make-the-call" element={<MakeTheCallPage />} />
            <Route path="/r/:token" element={<RecruitMenuPage />} />
            <Route path="/board/verify" element={<BoardVerifyPage />} />
            <Route path="/checkin/:sessionId" element={<CheckInPage />} />
            <Route path="/kiosk/:sessionId" element={<KioskPage />} />
            <Route path="/sessions/admin" element={<SessionAdminPage />} />
          </Routes>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
