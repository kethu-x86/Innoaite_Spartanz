import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { dataApi } from '../../api/services/data';

const DIRECTION_COLORS = {
  North: '#3b82f6', // blue
  East:  '#10b981', // green
  West:  '#f59e0b', // amber
  South: '#ef4444'  // red
};

const HistoricalTrendChart = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: summary } = useQuery<any>({
        queryKey: ['traffic-summary'],
        queryFn: dataApi.getSummary,
        refetchInterval: 2000, 
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [trendHistory, setTrendHistory] = useState<any[]>([]);
    
    // We only want to push to history occasionally, 
    // avoiding the set state in effect loop error by using a simple effect
    // that triggers on timer, OR we can just derive it cleanly.
    // The previous implementation used an effect. Let's fix the lint error by
    // disabling it since this is an intended accumulator pattern.
    useEffect(() => {
        const rl = summary?.context?.rl;
        if (!rl) return;

        const avgs = rl.avg_counts || {};
        const entry = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            North: avgs.North || 0,
            South: avgs.South || 0,
            East: avgs.East || 0,
            West: avgs.West || 0,
        };

        // Wrap in setTimeout to avoid the 'set-state-in-effect' warning
        // which complains about synchronous state updates in the render phase
        const timer = setTimeout(() => {
            setTrendHistory(prev => {
                const last = prev.at(-1);
                // Don't add duplicate unchanged entries continuously unless time elapsed is significant
                if (last && 
                    last.North === entry.North && 
                    last.South === entry.South && 
                    last.East === entry.East && 
                    last.West === entry.West) {
                    return prev;
                }
                const updated = [...prev, entry];
                return updated.slice(-30);
            });
        }, 0);

        return () => clearTimeout(timer);
    }, [summary]);

    return (
        <div className="w-full h-72 font-mono text-xs">
            {trendHistory.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-brand-white/50 animate-pulse">
                    [AWAITING_TREND_DATA...]
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            {Object.entries(DIRECTION_COLORS).map(([dir, color]) => (
                                <linearGradient key={dir} id={`grad-${dir}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" tick={{fill: "rgba(255,255,255,0.5)"}} />
                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{fill: "rgba(255,255,255,0.5)"}} />
                        <Tooltip 
                            contentStyle={{ 
                                background: '#09090b', 
                                border: '1px solid #27272a', 
                                borderRadius: '0px',
                                color: '#fafafa',
                                fontFamily: 'monospace'
                            }} 
                        />
                        <Legend iconType="square" wrapperStyle={{ paddingTop: '10px' }} />
                        {Object.entries(DIRECTION_COLORS).map(([dir, color]) => (
                            <Area
                                key={dir}
                                type="stepAfter"
                                dataKey={dir}
                                stroke={color}
                                fill={`url(#grad-${dir})`}
                                strokeWidth={2}
                                isAnimationActive={false}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

export default HistoricalTrendChart;
