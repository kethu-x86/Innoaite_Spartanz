import React, { useState } from 'react';
import { Play, Pause, FastForward, Activity, Shield, Siren } from 'lucide-react';
import { useTraffic } from '../context/TrafficContext';
import { api } from '../services/api';

const SimulationControl = () => {
    const { yoloAction, health, autoStep, setAutoStep, emergency, triggerEmergency, simSpeed, setSimSpeed } = useTraffic();
    const [loading, setLoading] = useState(false);
    const [selectedDir, setSelectedDir] = useState('North');

    const handleControl = async (actionFn, actionName) => {
        setLoading(true);
        try {
            await actionFn();
        } catch (error) {
            console.error(`Failed to send ${actionName} command:`, error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="simulation-container">
            <header className="page-header">
                <h2><Activity className="icon" /> Simulation Control</h2>
            </header>

            <div className="dashboard-grid">
                <div className="main-content">
                    {/* SUMO Controls */}
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3>SUMO Commands</h3>
                            <div className="status-badge" style={{ color: health.sumo_running ? 'var(--success)' : 'var(--danger)' }}>
                                {health.sumo_running ? 'Simulation Online' : 'Simulation Offline'}
                            </div>
                        </div>
                        <div className="button-group-premium">
                            <button className="btn-premium play" onClick={() => handleControl(api.startSumo, 'Start')} disabled={loading || health.sumo_running}>
                                <Play size={20} /> <span>Start Simulation</span>
                            </button>

                            <button
                                className={`btn-premium ${autoStep ? 'active' : ''}`}
                                onClick={() => setAutoStep(!autoStep)}
                                disabled={loading || !health.sumo_running}
                                style={{
                                    background: autoStep ? 'linear-gradient(135deg, var(--success), var(--primary))' : '',
                                    boxShadow: autoStep ? '0 0 20px rgba(0, 255, 127, 0.4)' : ''
                                }}
                            >
                                {autoStep ? <Pause size={20} /> : <Play size={20} />}
                                <span>{autoStep ? 'Auto-Proceed ON' : 'Auto-Proceed OFF'}</span>
                            </button>

                            <button className="btn-premium step" onClick={() => handleControl(api.stepSumo, 'Step')} disabled={loading || !health.sumo_running || autoStep}>
                                <FastForward size={20} /> <span>Manual Step</span>
                            </button>

                            <button className="btn-premium stop" onClick={() => handleControl(api.stopSumo, 'Stop')} disabled={loading || !health.sumo_running}>
                                <Pause size={20} /> <span>Stop Simulation</span>
                            </button>
                        </div>

                        {/* Speed Control Slider */}
                        <div style={{ marginTop: '1.5rem', padding: '0 1rem' }}>
                             <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <span>Simulation Speed</span>
                                <span>{simSpeed < 1000 ? 'Fast' : simSpeed > 1000 ? 'Slow' : 'Normal'} ({simSpeed}ms)</span>
                            </label>
                            <input 
                                type="range" 
                                min="200" 
                                max="2000" 
                                step="100" 
                                value={simSpeed} 
                                onChange={(e) => setSimSpeed(Number(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                disabled={!health.sumo_running}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                <span>Fast (0.2s)</span>
                                <span>Slow (2.0s)</span>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Override (New Section for Consistency) */}
                    <div className="card glass-card" style={{ marginTop: '1.5rem' }}>
                        <div className="card-header">
                            <h3><Shield size={18} /> Emergency Override</h3>
                        </div>
                        <div className="emergency-controls">
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
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
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
                    </div>
                </div>


                <div className="side-content">
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3>Inference Feedback</h3>
                        </div>
                        <div className="logic-display glass-inset">
                            {yoloAction ? (
                                <pre>{JSON.stringify(yoloAction, null, 2)}</pre>
                            ) : (
                                <div className="waiting-text">Awaiting live data...</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimulationControl;
