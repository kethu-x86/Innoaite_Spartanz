import React, { useState } from 'react';
import { AlertTriangle, Shield, Siren, Bell, ChevronDown, Radio } from 'lucide-react';
import { useTraffic } from '../context/TrafficContext';

const SEVERITY_COLORS = {
    normal: 'var(--success)',
    moderate: 'var(--warning)',
    heavy: '#ff6b35',
    critical: 'var(--danger)',
};

const SEVERITY_BG = {
    normal: 'rgba(16, 185, 129, 0.1)',
    moderate: 'rgba(245, 158, 11, 0.1)',
    heavy: 'rgba(255, 107, 53, 0.1)',
    critical: 'rgba(239, 68, 68, 0.15)',
};

const Alerts = () => {
    const { alerts, emergency, triggerEmergency, health } = useTraffic();
    const [selectedDir, setSelectedDir] = useState('North');
    const current = alerts?.current;
    const history = alerts?.history || [];

    return (
        <div className="alerts-container">
            <header className="page-header">
                <h2><Bell className="icon" /> Live Alert Center</h2>
                <div className={`status-badge ${health.status.toLowerCase()}`}>
                    <span className="pulse-dot"></span>
                    {emergency.active ? '🚨 EMERGENCY ACTIVE' : `System: ${health.status}`}
                </div>
            </header>

            {/* Emergency Banner */}
            {emergency.active && (
                <div className="emergency-banner">
                    <div className="emergency-banner-content">
                        <Siren size={24} />
                        <div>
                            <strong>EMERGENCY PRIORITY ACTIVE</strong>
                            <p>Direction: {emergency.direction} — Signal preemption engaged. Remaining: {emergency.remaining_seconds}s</p>
                        </div>
                    </div>
                    <button className="btn-emergency-cancel" onClick={() => triggerEmergency(emergency.direction, false)}>
                        Deactivate
                    </button>
                </div>
            )}

            <div className="dashboard-grid">
                <div className="main-content" style={{ gap: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    {/* Current Alert */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3><Radio size={18} /> Current Status</h3>
                            {current && (
                                <span className="severity-tag" style={{ 
                                    color: SEVERITY_COLORS[current.severity] || '#fff',
                                    background: SEVERITY_BG[current.severity] || 'transparent',
                                }}>
                                    {current.severity?.toUpperCase()}
                                </span>
                            )}
                        </div>
                        {current ? (
                            <div className="alert-current glass-inset" style={{
                                borderLeft: `4px solid ${SEVERITY_COLORS[current.severity] || '#fff'}`,
                                padding: '1.25rem',
                            }}>
                                <p className="alert-message">{current.message}</p>
                                <div className="alert-meta">
                                    <span>Junction: {current.junction || '—'}</span>
                                    <span>Direction: {current.direction || '—'}</span>
                                    <span>Queue: {current.queue_length || 0}</span>
                                    <span>Wait: {current.waiting_time || 0}s</span>
                                </div>
                            </div>
                        ) : (
                            <div className="loading-state">Waiting for traffic data...</div>
                        )}
                    </div>

                    {/* Alert History */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3><AlertTriangle size={18} /> Alert History</h3>
                            <span className="text-muted">{history.length} events</span>
                        </div>
                        <div className="alert-history-list">
                            {history.length > 0 ? history.map((alert, idx) => (
                                <div key={idx} className="alert-history-item glass-inset" style={{
                                    borderLeft: `3px solid ${SEVERITY_COLORS[alert.severity] || '#fff'}`,
                                }}>
                                    <div className="alert-history-header">
                                        <span className="severity-dot" style={{ background: SEVERITY_COLORS[alert.severity] }}></span>
                                        <span className="alert-severity-label">{alert.severity?.toUpperCase()}</span>
                                        <span className="alert-timestamp">{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : '—'}</span>
                                    </div>
                                    <p className="alert-history-message">{alert.message}</p>
                                </div>
                            )) : (
                                <div className="empty-state">No alerts recorded yet. Traffic is flowing normally.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="side-content">
                    {/* Emergency Control */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3><Shield size={18} /> Emergency Override</h3>
                        </div>
                        <div className="emergency-controls">
                            <p className="emergency-info">
                                Trigger a manual emergency signal preemption for a specific approach direction.
                            </p>
                            <div className="direction-selector">
                                {['North', 'South', 'East', 'West'].map(dir => (
                                    <button 
                                        key={dir}
                                        className={`dir-btn ${selectedDir === dir ? 'active' : ''}`}
                                        onClick={() => setSelectedDir(dir)}
                                    >
                                        {dir}
                                    </button>
                                ))}
                            </div>
                            <button 
                                className="btn-emergency-trigger"
                                onClick={() => triggerEmergency(selectedDir, true)}
                                disabled={emergency.active}
                            >
                                <Siren size={20} />
                                {emergency.active ? 'Emergency Active' : `Activate ${selectedDir} Priority`}
                            </button>
                            {emergency.active && (
                                <button 
                                    className="btn-emergency-deactivate"
                                    onClick={() => triggerEmergency(emergency.direction, false)}
                                >
                                    Deactivate Override
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Per-Direction Counts */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3>Direction Counts</h3>
                        </div>
                        <div className="direction-counts-grid">
                            {current?.vehicle_counts && Object.entries(current.vehicle_counts).map(([dir, count]) => (
                                <div key={dir} className="direction-count-item glass-inset">
                                    <span className="dir-label">{dir}</span>
                                    <span className="dir-count">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Alerts;
