import React from 'react';
import { ShieldAlert, AlertOctagon, Clock, MapPin } from 'lucide-react';
import { useTraffic } from '../context/TrafficContext';

const VIOLATION_COLORS = {
    warning: 'var(--warning)',
    critical: 'var(--danger)',
};

const Violations = () => {
    const { violations } = useTraffic();
    const violationList = violations?.violations || [];
    const activeStationary = violations?.active_stationary || {};

    const activeCount = Object.values(activeStationary).reduce((sum, arr) => sum + arr.length, 0);

    return (
        <div className="violations-container">
            <header className="page-header">
                <h2><ShieldAlert className="icon" /> Violation Monitor</h2>
                <div className="violation-summary-badge">
                    <span>{violationList.length} violations logged</span>
                    {activeCount > 0 && (
                        <span className="active-violations-badge">{activeCount} active</span>
                    )}
                </div>
            </header>

            <div className="dashboard-grid">
                <div className="main-content" style={{ gap: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    {/* Violation Log */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3><AlertOctagon size={18} /> Violation Log</h3>
                        </div>
                        <div className="violation-table-wrapper">
                            {violationList.length > 0 ? (
                                <table className="violation-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Camera / Direction</th>
                                            <th>Type</th>
                                            <th>Duration</th>
                                            <th>Severity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {violationList.map((v, idx) => (
                                            <tr key={idx} className={`violation-row ${v.severity}`}>
                                                <td className="v-time">
                                                    <Clock size={14} />
                                                    {v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : '—'}
                                                </td>
                                                <td className="v-cam">
                                                    <MapPin size={14} />
                                                    {v.cam_id || '—'}
                                                </td>
                                                <td className="v-type">
                                                    {v.type === 'illegal_parking' ? '🅿️ Illegal Parking' : '⚠️ Lane Violation'}
                                                </td>
                                                <td className="v-duration">{v.duration ? `${v.duration}s` : '—'}</td>
                                                <td>
                                                    <span className="v-severity" style={{
                                                        color: VIOLATION_COLORS[v.severity] || '#fff',
                                                        background: `${VIOLATION_COLORS[v.severity] || '#fff'}20`,
                                                    }}>
                                                        {v.severity?.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="empty-state">
                                    <ShieldAlert size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p>No violations detected. All lanes clear.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="side-content">
                    {/* Active Stationary Vehicles */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3>Active Stationary Vehicles</h3>
                        </div>
                        <div className="stationary-list">
                            {Object.keys(activeStationary).length > 0 ? (
                                Object.entries(activeStationary).map(([camId, vehicles]) => (
                                    <div key={camId} className="stationary-group glass-inset">
                                        <h4 className="stationary-cam">{camId}</h4>
                                        {vehicles.map((v, i) => (
                                            <div key={i} className="stationary-item">
                                                <span className="stationary-duration">{v.duration}s</span>
                                                <span className={`stationary-flag ${v.flagged ? 'flagged' : ''}`}>
                                                    {v.flagged ? '🚫 FLAGGED' : '⏳ Monitoring'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state small">No stationary vehicles detected.</div>
                            )}
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3>Statistics</h3>
                        </div>
                        <div className="violation-stats-grid">
                            <div className="vstat glass-inset">
                                <label>Total Violations</label>
                                <span className="vstat-value">{violationList.length}</span>
                            </div>
                            <div className="vstat glass-inset">
                                <label>Illegal Parking</label>
                                <span className="vstat-value">
                                    {violationList.filter(v => v.type === 'illegal_parking').length}
                                </span>
                            </div>
                            <div className="vstat glass-inset">
                                <label>Active Alerts</label>
                                <span className="vstat-value">{activeCount}</span>
                            </div>
                            <div className="vstat glass-inset">
                                <label>Critical</label>
                                <span className="vstat-value" style={{ color: 'var(--danger)' }}>
                                    {violationList.filter(v => v.severity === 'critical').length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Violations;
