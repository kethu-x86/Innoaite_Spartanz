import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TrafficProvider } from './context/TrafficContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Configuration from './pages/Configuration';
import SimulationControl from './pages/SimulationControl';
import TrafficSummary from './pages/TrafficSummary';
import Alerts from './pages/Alerts';
import Violations from './pages/Violations';

function App() {
  return (
    <TrafficProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="app-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/config" element={<Configuration />} />
              <Route path="/summary" element={<TrafficSummary />} />
              <Route path="/simulation" element={<SimulationControl />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/violations" element={<Violations />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TrafficProvider>
  );
}

export default App;
