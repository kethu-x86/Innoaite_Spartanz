import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './features/dashboard/Dashboard';
import SimulationPanel from './features/simulation/SimulationPanel';
import LogsDashboard from './features/logs/LogsDashboard';
import { SimulationProvider } from './hooks/useSimulation';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SimulationProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-brand-black text-brand-white font-sans flex overflow-hidden">
            
            {/* Brutalist Sidebar */}
            <nav className="w-64 border-r-2 border-brand-gray flex flex-col p-6 gap-8 bg-brand-darkgray relative z-20">
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase text-brand-green">
                  Neuro<span className="text-brand-white">Traffic</span>
                </h1>
                <p className="font-mono text-xs text-brand-white/70 mt-2 uppercase tracking-widest">v1.0.0-STC</p>
              </div>
              
              <div className="flex flex-col gap-4 mt-8">
                <Link to="/dashboard" className="font-mono uppercase tracking-wider text-sm hover:text-brand-green transition-colors">Dashboard</Link>
                <Link to="/simulation" className="font-mono uppercase tracking-wider text-sm hover:text-brand-green transition-colors">Simulation & Control</Link>
                <Link to="/logs" className="font-mono uppercase tracking-wider text-sm hover:text-brand-green transition-colors">Historical Logs</Link>
              </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative h-screen">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/simulation" element={<SimulationPanel />} />
                <Route path="/logs" element={<LogsDashboard />} />
              </Routes>
            </main>
            
          </div>
        </BrowserRouter>
      </SimulationProvider>
    </QueryClientProvider>
  );
}

export default App;
