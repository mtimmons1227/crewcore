import { Routes, Route } from 'react-router-dom';
import LeadCapturePage from './pages/LeadCapturePage';
import CommandCenterPage from './pages/CommandCenterPage';

function App() {
  return (
    <div className="page-shell">
      <div className="frame">
        <Routes>
          <Route path="/" element={<LeadCapturePage />} />
          <Route path="/command" element={<CommandCenterPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
