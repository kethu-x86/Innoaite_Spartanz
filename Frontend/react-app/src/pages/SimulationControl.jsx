import React, { useState, useEffect } from 'react';
import { Play, Pause, FastForward, Activity } from 'lucide-react';
import { ENDPOINTS } from '../config';

const SimulationControl = () => {
    const [loading, setLoading] = useState(false);
    const [yoloAction, setYoloAction] = useState(null);

    useEffect(() => {
        const fetchYoloAction = async () => {
            try {
                const response = await fetch(ENDPOINTS.CONTROL_YOLO);
                const result = await response.json();
                setYoloAction(result);
            } catch (error) {
                console.error('Error fetching yolo action:', error);
            }
        };

        const interval = setInterval(fetchYoloAction, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleControl = async (endpoint, actionName) => {
        setLoading(true);
        try {
            await fetch(endpoint);
            // alert(`${actionName} command sent successfully.`);
        } catch (error) {
            alert(`Failed to send ${actionName} command.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="simulation-container">
            <header className="page-header">
                <h2><Activity className="icon" /> Simulation Control</h2>
            </header>

            <div className="content-grid">
                <div className="card control-panel">
                    <h3>SUMO Controls</h3>
                    <div className="button-group">
                        <button className="btn primary" onClick={() => handleControl(ENDPOINTS.CONTROL_SUMO_START, 'Start')} disabled={loading}>
                            <Play size={18} style={{ marginRight: '8px' }} /> Start
                        </button>
                        <button className="btn secondary" onClick={() => handleControl(ENDPOINTS.CONTROL_SUMO_STEP, 'Step')} disabled={loading}>
                            <FastForward size={18} style={{ marginRight: '8px' }} /> Step
                        </button>
                        <button className="btn danger" onClick={() => handleControl(ENDPOINTS.CONTROL_SUMO_STOP, 'Stop')} disabled={loading}>
                            <Pause size={18} style={{ marginRight: '8px' }} /> Stop
                        </button>
                    </div>
                </div>

                <div className="card">
                    <h3>YOLO Action Status</h3>
                    <div className="action-display">
                        {yoloAction ? JSON.stringify(yoloAction, null, 2) : "Waiting for data..."}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimulationControl;
