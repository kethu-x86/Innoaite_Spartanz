import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { simulationApi, emergencyApi } from '../../api/services/simulation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import WebRTCPlayer from './WebRTCPlayer';
import MaskConfig from './MaskConfig';
import { useSimulation } from '../../hooks/useSimulation';

const SimulationPanel = () => {
    const { isAutoRun, setIsAutoRun, tickSpeed, setTickSpeed } = useSimulation();
    const { data: emergencyState, refetch: refetchEmergency } = useQuery<{direction: string, active: boolean} | null>({
        queryKey: ['emergency-state'],
        queryFn: async () => (await emergencyApi.getEmergencyState()) as {direction: string, active: boolean},
        refetchInterval: 3000,
    });

    const setEmergencyMutation = useMutation({
        mutationFn: emergencyApi.setEmergencyPriority,
        onSuccess: () => refetchEmergency(),
    });

    const startMutation = useMutation({ mutationFn: simulationApi.start });
    const stopMutation = useMutation({ mutationFn: simulationApi.stop });
    const stepMutation = useMutation({ mutationFn: simulationApi.step });

    const [activeCam, setActiveCam] = useState('North');

    return (
        <div className="p-8 h-full flex flex-col gap-6">
            <header className="flex justify-between items-end border-b-2 border-brand-gray pb-4">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Simulation & Control</h2>
                    <p className="font-mono text-brand-white/70 mt-2 uppercase text-sm">{`// SUMO ENGINE OVR_RD // AI MASKING`}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full text-brand-white">
                
                {/* 30% Width: Controls */}
                <div className="lg:col-span-4 flex flex-col gap-6 font-mono text-sm leading-relaxed">
                    <Card title="Engine Control">
                        <div className="flex flex-col gap-4">
                            <Button onClick={() => startMutation.mutateAsync()} disabled={startMutation.isPending}>
                                Initialize SUMO
                            </Button>
                            <Button variant="ghost" className="border-brand-gray" onClick={() => stepMutation.mutateAsync()} disabled={stepMutation.isPending || isAutoRun}>
                                Step Engine (1 Tick)
                            </Button>
                            <Button variant={isAutoRun ? "alert" : "ghost"} className="border-brand-gray" onClick={() => setIsAutoRun(!isAutoRun)}>
                                {isAutoRun ? "Halt Auto-Run" : "Start Auto-Run"}
                            </Button>
                            <div className="flex flex-col gap-2 mt-2">
                                <label className="text-[10px] text-brand-white/70 tracking-widest uppercase">Tick Interval: {tickSpeed}ms</label>
                                <input 
                                    type="range" 
                                    min="100" 
                                    max="3000" 
                                    step="100" 
                                    value={tickSpeed} 
                                    onChange={(e) => setTickSpeed(Number(e.target.value))}
                                    className="w-full accent-brand-green bg-brand-gray h-1 appearance-none cursor-pointer"
                                />
                            </div>
                            <Button variant="alert" onClick={() => { setIsAutoRun(false); stopMutation.mutateAsync(); }} disabled={stopMutation.isPending}>
                                Terminate SUMO
                            </Button>
                        </div>
                    </Card>

                    <Card title="Emergency Override (E_OVR)">
                        <div className="grid grid-cols-2 gap-4">
                            {['North', 'South', 'East', 'West'].map((dir) => {
                                const isActive = emergencyState?.direction === dir && emergencyState?.active;
                                return (
                                    <Button 
                                        key={dir} 
                                        variant={isActive ? 'alert' : 'ghost'}
                                        onClick={() => setEmergencyMutation.mutateAsync({ direction: dir, active: !isActive })}
                                    >
                                        {dir}
                                    </Button>
                                )
                            })}
                        </div>
                        <p className="mt-4 text-xs text-brand-white/70 uppercase border-l-2 border-brand-red pl-2">
                           {emergencyState?.active ? `PRIORITY_ACTIVE: ${emergencyState.direction}` : 'NO_ACTIVE_PRIORITIES'}
                        </p>
                    </Card>
                </div>

                {/* 70% Width: Visual Suite */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="flex gap-4 border-b-2 border-brand-gray pb-4">
                        {['North', 'South', 'East', 'West'].map(dir => (
                            <button
                                key={dir}
                                onClick={() => setActiveCam(dir)}
                                className={`uppercase font-mono text-sm tracking-widest pb-2 border-b-2 transition-colors ${activeCam === dir ? 'border-brand-green text-brand-green' : 'border-transparent text-brand-white/60 hover:text-brand-white'}`}
                            >
                                CAM_{dir}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-6 h-[500px]">
                        <Card title="LIVE STREAM">
                            <WebRTCPlayer camId={activeCam} />
                        </Card>
                        
                        <Card title="MASK CONFIGURATOR">
                            <MaskConfig camId={activeCam} />
                        </Card>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SimulationPanel;
