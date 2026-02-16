import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TrafficProvider } from './context/TrafficContext';
import Navbar from './components/Navbar';
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
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/config" element={<Configuration />} />
          <Route path="/summary" element={<TrafficSummary />} />
          <Route path="/simulation" element={<SimulationControl />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/violations" element={<Violations />} />
        </Routes>
      </BrowserRouter>
    </TrafficProvider>
  );
}

export default App;
