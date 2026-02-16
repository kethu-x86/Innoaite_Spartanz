import React from 'react';
import { FileText, TrendingUp, AlertTriangle, Shield, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTraffic } from '../context/TrafficContext';

import { DIRECTION_COLORS } from '../constants';

const TrafficSummary = () => {
    const { summary, refreshSummary, alerts, violations, emergency } = useTraffic();
    const rl = summary?.context?.rl || {};
    const avgs = rl.avg_counts || {};
    const congestionIndex = rl.predicted_congestion_index /18 || 0;
    const narrativeText = summary?.summary || 'Loading traffic summary...';
    const current = alerts?.current;
    const violationList = violations?.violations || [];

    return (
        <div className="summary-container">
            <header className="page-header">
                <h2><FileText className="icon" /> Traffic Intelligence</h2>
                <button className="btn-refresh glass-btn" onClick={refreshSummary}>
                    Refresh Summary
                </button>
            </header>

            {/* Emergency Banner */}
            {emergency?.active && (
                <div className="emergency-banner">
                    <div className="emergency-banner-content">
                        <Shield size={20} />
                        <span><strong>EMERGENCY ACTIVE:</strong> {emergency.direction} approach priority — {emergency.remaining_seconds}s remaining</span>
                    </div>
                </div>
            )}

            <div className="dashboard-grid">
                <div className="main-content" style={{ gap: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    {/* AI Narrative */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3><FileText size={18} /> AI Traffic Summary</h3>
                        </div>
                        <div className="narrative-box glass-inset">
                            <div className="narrative-text">
                                <ReactMarkdown>{narrativeText}</ReactMarkdown>
                            </div>
                        </div>
                    </div>

                    {/* Per-Direction Metrics */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3><TrendingUp size={18} /> Direction Metrics</h3>
                        </div>
                        <div className="direction-metrics-grid">
                            {['North', 'South', 'East', 'West'].map(dir => {
                                const val = avgs[dir] || 0;
                                return (
                                    <div key={dir} className="direction-metric-card glass-inset" style={{
                                        borderTop: `3px solid ${DIRECTION_COLORS[dir]}`,
                                    }}>
                                        <div className="dm-header">
                                            <span className="dm-dir" style={{ color: DIRECTION_COLORS[dir] }}>{dir}</span>
                                            <span className="dm-icon">🧭</span>
                                        </div>
                                        <div className="dm-value">{typeof val === 'number' ? val.toFixed(1) : val}</div>
                                        <div className="dm-label">Avg Count (10-min)</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="side-content">
                    {/* Congestion Index */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3>Congestion Index</h3>
                        </div>
                        <div className="congestion-gauge glass-inset">
                            <div className="gauge-value" style={{
                                color: congestionIndex > 0.7 ? 'var(--danger)' : congestionIndex > 0.4 ? 'var(--warning)' : 'var(--success)',
                            }}>
                                {(congestionIndex * 4).toFixed(0)}%
                            </div>
                            <div className="gauge-bar">
                                <div className="gauge-fill" style={{
                                    width: `${congestionIndex * 100}%`,
                                    background: congestionIndex > 0.7 ? 'var(--danger)' : congestionIndex > 0.4 ? 'var(--warning)' : 'var(--success)',
                                }} />
                            </div>
                            <span className="gauge-label">
                                {congestionIndex > 0.7 ? 'Heavy' : congestionIndex > 0.4 ? 'Moderate' : 'Normal'}
                            </span>
                        </div>
                    </div>

                    {/* Current Alert */}
                    {current && current.severity !== 'normal' && (
                        <div className="card glass-card">
                            <div className="card-header">
                                <h3><AlertTriangle size={18} /> Active Alert</h3>
                            </div>
                            <div className="glass-inset" style={{
                                padding: '1rem',
                                borderLeft: `3px solid ${current.severity === 'critical' ? 'var(--danger)' : current.severity === 'heavy' ? '#ff6b35' : 'var(--warning)'}`,
                            }}>
                                <p style={{ fontSize: '0.85rem' }}>{current.message}</p>
                            </div>
                        </div>
                    )}

                    {/* Violations Summary */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3><ShieldAlert size={18} /> Violations</h3>
                        </div>
                        <div className="violation-summary-stats glass-inset">
                            <div className="vs-item">
                                <span className="vs-count">{violationList.length}</span>
                                <span className="vs-label">Total</span>
                            </div>
                            <div className="vs-item">
                                <span className="vs-count" style={{ color: 'var(--danger)' }}>
                                    {violationList.filter(v => v.severity === 'critical').length}
                                </span>
                                <span className="vs-label">Critical</span>
                            </div>
                            <div className="vs-item">
                                <span className="vs-count" style={{ color: 'var(--warning)' }}>
                                    {violationList.filter(v => v.severity === 'warning').length}
                                </span>
                                <span className="vs-label">Warning</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrafficSummary;
