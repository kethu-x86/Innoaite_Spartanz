import React, { useState, useEffect } from 'react';
import { Activity, Camera } from 'lucide-react';
import { ENDPOINTS } from '../config';
import WebRTCPlayer from '../components/WebRTCPlayer';

const Dashboard = () => {
    const [data, setData] = useState({});
    const [health, setHealth] = useState({ status: 'Unknown' });
    const [yoloAction, setYoloAction] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(ENDPOINTS.DATA);
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        const fetchHealth = async () => {
            try {
                const response = await fetch(ENDPOINTS.HEALTH);
                if (response.ok) {
                    setHealth({ status: 'Online' });
                } else {
                    setHealth({ status: 'Offline' });
                }
            } catch (error) {
                setHealth({ status: 'Offline' });
            }
        };

        const fetchYoloAction = async () => {
            try {
                const response = await fetch(ENDPOINTS.CONTROL_YOLO);
                const result = await response.json();
                setYoloAction(result);
            } catch (error) {
                console.error('Error fetching yolo action:', error);
            }
        };

        const interval = setInterval(() => {
            fetchData();
            fetchYoloAction();
        }, 1000);

        const healthInterval = setInterval(fetchHealth, 5000);
        fetchHealth(); // Initial check

        return () => {
            clearInterval(interval);
            clearInterval(healthInterval);
        };
    }, []);

    return (
        <div className="dashboard-container">
            <header className="page-header">
                <h2><Activity className="icon" /> Live Dashboard</h2>
                <div className={`status-badge ${health.status.toLowerCase()}`}>
                    System: {health.status}
                </div>
            </header>

            <div className="content-grid">
                <div className="video-section card">
                    <h3>Live Feeds</h3>
                    <div className="video-grid">
                        {['CAM_00', 'CAM_01', 'CAM_02', 'CAM_03'].map((camId) => (
                            <div key={camId} className="cam-feed">
                                <span className="cam-label">{camId}</span>
                                <WebRTCPlayer camId={camId} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="stats-section">
                    <div className="card mb-4">
                        <h3>Traffic Stats</h3>
                        {Object.keys(data).length > 0 ? (
                            <div className="stats-grid">
                                {Object.entries(data).map(([key, value]) => (
                                    <div key={key} className="stat-card">
                                        <h4>{key}</h4>
                                        <p className="stat-value">{value.count}</p>
                                        <span className="stat-timestamp">{new Date(value.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>Loading stats...</p>
                        )}
                    </div>

                    <div className="card control-panel">
                        <h3>Traffic Control</h3>

                        <div className="yolo-status">
                            <h4>Current Action</h4>
                            <div className="action-display">
                                {yoloAction ? JSON.stringify(yoloAction) : "Waiting..."}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
