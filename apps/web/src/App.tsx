import { Routes, Route, useLocation } from 'react-router-dom';
import LeadCapturePage from './pages/LeadCapturePage';
import CommandCenterPage from './pages/CommandCenterPage';
import RecruitMenuPage from './pages/RecruitMenuPage';

function App() {
  const location = useLocation();
  const isCommandCenter = location.pathname === '/command';
  const isLeadCapture = location.pathname === '/';

  const shellClass = isCommandCenter || isLeadCapture ? 'min-h-screen bg-slate-100' : 'page-shell';
  const frameClass = isCommandCenter
    ? 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'
    : isLeadCapture
      ? 'mx-auto w-full max-w-lg px-4 py-6 sm:px-6'
      : 'frame';

  return (
    <div className={shellClass}>
      <div className={frameClass}>
        <Routes>
          <Route path="/" element={<LeadCapturePage />} />
          <Route path="/command" element={<CommandCenterPage />} />
          <Route path="/r/:token" element={<RecruitMenuPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
