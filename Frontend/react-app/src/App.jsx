import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Configuration from './pages/Configuration';
import TrafficSummary from './pages/TrafficSummary';
import SimulationControl from './pages/SimulationControl';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/configuration" element={<Configuration />} />
            <Route path="/summary" element={<TrafficSummary />} />
            <Route path="/simulation" element={<SimulationControl />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
