import { useQuery } from '@tanstack/react-query';
import { dataApi } from '../../api/services/data';
import { Card } from '../../components/ui/Card';
import { TrafficLogsTable } from './TrafficLogsTable';
import WebRTCPlayer from '../simulation/WebRTCPlayer';
import SumoOverlay from '../simulation/SumoOverlay';
import HistoricalTrendChart from './HistoricalTrendChart';

const Dashboard = () => {
  const { data: counts } = useQuery({
    queryKey: ['traffic-counts'],
    queryFn: dataApi.getTrafficData,
    refetchInterval: 2000, // Update every 2 seconds
  });

  const { data: summary } = useQuery({
    queryKey: ['traffic-summary'],
    queryFn: dataApi.getSummary,
    refetchInterval: 60000, 
  });

  const { data: health } = useQuery({
    queryKey: ['system-health'],
    queryFn: dataApi.getHealth,
    refetchInterval: 5000,
  });

  return (
    <div className="p-8 h-full flex flex-col gap-6">
      <header className="flex justify-between items-end border-b-2 border-brand-gray pb-4">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">Live Monitor</h2>
          <p className="font-mono text-brand-green mt-2 uppercase text-sm">System: {health?.status || 'CONNECTING...'}</p>
        </div>
        <div className="font-mono text-xs text-right text-brand-white/70 space-y-1">
          <p>MODELS: {health?.models_loaded ? 'ONLINE' : 'OFFLINE'}</p>
          <p>ENGINE: {health?.sumo_running ? 'ACTIVE' : 'IDLE'}</p>
        </div>
      </header>

      {/* 90/10 Asymmetric Grid Layout overriding safe-split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 tracking-wide">
        
        {/* Main 75% View: Camera & Matrix */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <Card className="flex-1 min-h-[400px]" title="CAM_STREAM // WebRTC">
             <div className="grid grid-cols-2 gap-4 h-full">
                {['North', 'East', 'West', 'South'].map(dir => (
                    <div key={dir} className="relative bg-black border border-brand-gray flex items-center justify-center overflow-hidden group aspect-video">
                        {/* Label Badge */}
                        <div className="absolute top-3 left-3 z-30 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-sm text-[10px] font-mono font-bold tracking-widest text-brand-white border border-white/10">
                            CAM_{dir}
                        </div>
                        
                        {/* Fallback styling removed to let WebRTCPlayer handle its own UI */}
                        <div className="w-full h-full z-20">
                            {health?.sumo_running ? (
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                <SumoOverlay direction={dir as any} />
                            ) : (
                                <WebRTCPlayer camId={dir} />
                            )}
                        </div>
                    </div>
                ))}
             </div>
          </Card>

          <div className="grid grid-cols-4 gap-4">
             {['North', 'South', 'East', 'West'].map((dir) => (
                <Card key={dir} className="bg-brand-black text-center py-6">
                  <p className="font-mono text-xs text-brand-white/70 uppercase mb-2">Q_{dir}</p>
                  <p className="text-4xl font-bold text-brand-green">
                    {counts ? counts[dir as keyof typeof counts]?.count : '00'}
                  </p>
                </Card>
             ))}
          </div>
        </div>

        {/* Dense 25% Sidebar Data */}
        <div className="flex flex-col gap-6">
          <Card title="AI Analyst Synopsis" className="h-64 overflow-y-auto">
             <p className="font-mono text-sm leading-relaxed text-brand-white/80">
                {summary?.summary || "Awaiting LLM response..."}
             </p>
          </Card>

          <Card title="Live Alerts" className="flex-1 overflow-y-auto">
             <div className="font-mono text-xs space-y-4">
                <p className="border-l-2 border-brand-red pl-2 text-brand-red">⚠️ WARNING: NO ACTIVE ALERTS STREAM IN V1</p>
                <p className="border-l-2 border-brand-white/50 pl-2 text-brand-white/50">STANDBY...</p>
             </div>
          </Card>
        </div>

      </div>

      <div className="mt-8 mb-8 w-full border-t-2 border-brand-gray pt-8 flex flex-col gap-8">
        <Card title="Traffic Volume Trend (Last 30 Ticks)">
            <HistoricalTrendChart />
        </Card>
        <TrafficLogsTable />
      </div>
    </div>
  );
};

export default Dashboard;
