import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TrafficProvider } from './context/TrafficContext';
import Sidebar from './components/Sidebar';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Configuration = lazy(() => import('./pages/Configuration'));
const SimulationControl = lazy(() => import('./pages/SimulationControl'));
const TrafficSummary = lazy(() => import('./pages/TrafficSummary'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Violations = lazy(() => import('./pages/Violations'));

function App() {
  return (
    <TrafficProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="app-content">
            <Suspense fallback={<div className="loading-screen">Loading Kochi AI...</div>}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/config" element={<Configuration />} />
                <Route path="/summary" element={<TrafficSummary />} />
                <Route path="/simulation" element={<SimulationControl />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/violations" element={<Violations />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </BrowserRouter>
    </TrafficProvider>
  );
}

export default App;
