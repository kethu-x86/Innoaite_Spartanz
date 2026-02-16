import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, TrendingUp, Cpu, Shield, Siren, AlertTriangle } from 'lucide-react';
import { useTraffic } from '../context/TrafficContext';
import WebRTCPlayer from '../components/WebRTCPlayer';
import SumoOverlay from '../components/SumoOverlay';

import { DIRECTION_COLORS } from '../constants';

const Dashboard = () => {
    const { data, health, yoloAction, summary, alerts, emergency } = useTraffic();

    // Build chart data from summary context
    const chartData = useMemo(() => {
        const rl = summary?.context?.rl;
        if (!rl) return [];

        // Use average counts per direction if available
        const avgs = rl.avg_counts || {};
        const entry = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            North: avgs.North || 0,
            South: avgs.South || 0,
            East: avgs.East || 0,
            West: avgs.West || 0,
        };
        return [entry];
    }, [summary]);

    // Historical chart tracking
    const [trendHistory, setTrendHistory] = useState([]);

    // Accumulate trend data over time
    React.useEffect(() => {
        if (chartData.length > 0) {
            setTrendHistory(prev => {
                const updated = [...prev, chartData[0]];
                return updated.slice(-30); // Keep last 30 entries
            });
        }
    }, [chartData]);

    // Get the counts — normalize based on source
    const simRunning = health.sumo_running;
    const rlData = summary?.context?.rl;
    const counts = simRunning 
        ? rlData?.current_counts || {} 
        : data || {};

    // Normalize count values
    const getCount = (dirKey) => {
        const val = counts[dirKey];
        if (typeof val === 'number') return val;
        if (val?.count !== undefined) return val.count;
        return 0;
    };

    const totalVehicles = ['North', 'South', 'East', 'West'].reduce(
        (sum, d) => sum + getCount(d), 0
    );

    const current = alerts?.current;

    return (
        <div className="dashboard-container">
            {/* Emergency Banner */}
            {emergency?.active && (
                <div className="emergency-banner dashboard-emergency">
                    <div className="emergency-banner-content">
                        <Siren size={20} />
                        <span><strong>EMERGENCY:</strong> {emergency.direction} approach priority active ({emergency.remaining_seconds}s remaining)</span>
                    </div>
                </div>
            )}

            <header className="page-header">
                <h2><Activity className="icon" /> Traffic Dashboard</h2>
                <div className={`status-badge ${health.status?.toLowerCase?.() || 'unknown'}`}>
                    <span className="pulse-dot"></span>
                    {health.status}
                </div>
            </header>

            <div className="dashboard-grid">
                <div className="main-content">
                    {/* Video Grid */}
                    <div className="video-grid">
                        {['North', 'East', 'West', 'South'].map(dir => (
                            <div key={dir} className="video-cell glass-card">
                                <div className="video-label">{dir}</div>
                                {simRunning ? (
                                    <SumoOverlay direction={dir} />
                                ) : (
                                    <WebRTCPlayer camId={dir} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Per-Direction Trend Chart */}
                    <div className="card glass-card chart-card">
                        <div className="card-header">
                            <h3><TrendingUp size={18} /> Traffic Volume by Direction</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={trendHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                    {Object.entries(DIRECTION_COLORS).map(([dir, color]) => (
                                        <linearGradient key={dir} id={`gradient-${dir}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                            <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
                                <Tooltip 
                                    contentStyle={{ 
                                        background: 'rgba(10,15,30,0.9)', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        borderRadius: '8px',
                                        fontSize: '12px' 
                                    }} 
                                />
                                <Legend />
                                {Object.entries(DIRECTION_COLORS).map(([dir, color]) => (
                                    <Area
                                        key={dir}
                                        type="monotone"
                                        dataKey={dir}
                                        stroke={color}
                                        fill={`url(#gradient-${dir})`}
                                        strokeWidth={2}
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="side-content">
                    {/* Zone Occupancy */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3>Zone Occupancy</h3>
                            <span className="total-count">{totalVehicles} total</span>
                        </div>
                        <div className="zone-stats">
                            {['North', 'South', 'East', 'West'].map(dir => {
                                const count = getCount(dir);
                                const pct = totalVehicles > 0 ? (count / totalVehicles) * 100 : 0;
                                return (
                                    <div key={dir} className="zone-item">
                                        <div className="zone-header">
                                            <span className="zone-label" style={{ color: DIRECTION_COLORS[dir] }}>{dir}</span>
                                            <span className="zone-value">{count}</span>
                                        </div>
                                        <div className="zone-bar">
                                            <div 
                                                className="zone-bar-fill" 
                                                style={{ 
                                                    width: `${pct}%`, 
                                                    background: DIRECTION_COLORS[dir] 
                                                }} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* AI Control Status */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3><Cpu size={18} /> AI Control</h3>
                        </div>
                        <div className="control-status">
                            <div className="control-item glass-inset">
                                <span className="control-label">Decision Engine</span>
                                <span className={`status-indicator ${health.models_loaded ? 'active' : 'inactive'}`}>
                                    {health.models_loaded ? 'ACTIVE' : 'OFFLINE'}
                                </span>
                            </div>
                            <div className="control-item glass-inset">
                                <span className="control-label">Last Action</span>
                                <span>{yoloAction?.action === 0 ? 'KEEP' : yoloAction?.action === 1 ? 'SWITCH' : '—'}</span>
                            </div>
                            <div className="control-item glass-inset">
                                <span className="control-label">Source</span>
                                <span>{simRunning ? 'SUMO' : 'YOLO'}</span>
                            </div>
                            {emergency?.active && (
                                <div className="control-item glass-inset emergency-control-item">
                                    <span className="control-label"><Shield size={14} /> Emergency</span>
                                    <span style={{ color: 'var(--danger)' }}>{emergency.direction} PRIORITY</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Latest Alerts Mini-Feed */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3><AlertTriangle size={18} /> Latest Alerts</h3>
                        </div>
                        <div className="mini-alert-feed">
                            {current && current.severity !== 'normal' ? (
                                <div className="mini-alert glass-inset" style={{
                                    borderLeft: `3px solid ${
                                        current.severity === 'critical' ? 'var(--danger)' : 
                                        current.severity === 'heavy' ? '#ff6b35' : 
                                        'var(--warning)'
                                    }`,
                                }}>
                                    <span className="mini-alert-severity">{current.severity?.toUpperCase()}</span>
                                    <p className="mini-alert-msg">{current.message}</p>
                                </div>
                            ) : (
                                <div className="mini-alert glass-inset normal">
                                    <p>Traffic flowing normally ✓</p>
                                </div>
                            )}
                            {alerts?.history?.slice(0, 2).map((a) => (
                                <div key={a.timestamp || Math.random()} className="mini-alert glass-inset" style={{
                                    borderLeft: `3px solid ${
                                        a.severity === 'critical' ? 'var(--danger)' : 
                                        a.severity === 'heavy' ? '#ff6b35' : 
                                        'var(--warning)'
                                    }`,
                                    opacity: 0.7,
                                }}>
                                    <span className="mini-alert-severity">{a.severity?.toUpperCase()}</span>
                                    <p className="mini-alert-msg">{a.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
