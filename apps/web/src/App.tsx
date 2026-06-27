import { Routes, Route, useLocation } from 'react-router-dom';
import LeadCapturePage from './pages/LeadCapturePage';
import CommandCenterPage from './pages/CommandCenterPage';
import RecruitMenuPage from './pages/RecruitMenuPage';

function App() {
  const location = useLocation();
  const isCommandCenter = location.pathname === '/command';

  return (
    <div className={isCommandCenter ? 'min-h-screen bg-slate-100' : 'page-shell'}>
      <div className={isCommandCenter ? 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8' : 'frame'}>
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
