import React, { useState } from 'react';
import { Play, Pause, FastForward, Activity } from 'lucide-react';
import { ENDPOINTS } from '../config';
import { useTraffic } from '../context/TrafficContext';


const SimulationControl = () => {
    const { yoloAction, health, autoStep, setAutoStep } = useTraffic();
    const [loading, setLoading] = useState(false);

    const handleControl = async (endpoint, actionName) => {
        setLoading(true);
        try {
            const res = await fetch(endpoint);
            if (!res.ok) throw new Error();
        } catch (error) {
            console.error(`Failed to send ${actionName} command.`);
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
                    <div className="card glass-card">
                        <div className="card-header">
                            <h3>SUMO Commands</h3>
                            <div className="status-badge" style={{ color: health.sumo_running ? 'var(--success)' : 'var(--danger)' }}>
                                {health.sumo_running ? 'Simulation Online' : 'Simulation Offline'}
                            </div>
                        </div>
                        <div className="button-group-premium">
                            <button className="btn-premium play" onClick={() => handleControl(ENDPOINTS.CONTROL_SUMO_START, 'Start')} disabled={loading || health.sumo_running}>
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

                            <button className="btn-premium step" onClick={() => handleControl(ENDPOINTS.CONTROL_SUMO_STEP, 'Step')} disabled={loading || !health.sumo_running || autoStep}>
                                <FastForward size={20} /> <span>Manual Step</span>
                            </button>

                            <button className="btn-premium stop" onClick={() => handleControl(ENDPOINTS.CONTROL_SUMO_STOP, 'Stop')} disabled={loading || !health.sumo_running}>
                                <Pause size={20} /> <span>Stop Simulation</span>
                            </button>
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
