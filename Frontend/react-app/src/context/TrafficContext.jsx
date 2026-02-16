import React, { createContext, useContext, useState, useEffect } from 'react';
import { ENDPOINTS } from '../config';

const TrafficContext = createContext();

export const TrafficProvider = ({ children }) => {
    const [data, setData] = useState({});
    const [health, setHealth] = useState({ status: 'Unknown', models_loaded: false, sumo_running: false, emergency_active: false, emergency_direction: null });
    const [yoloAction, setYoloAction] = useState(null);
    const [summary, setSummary] = useState(null);
    const [autoStep, setAutoStep] = useState(false);
    const [alerts, setAlerts] = useState({ current: null, history: [] });
    const [violations, setViolations] = useState({ violations: [], active_stationary: {} });
    const [emergency, setEmergency] = useState({ active: false, direction: null, remaining_seconds: 0 });


    const fetchData = async () => {
        try {
            const res = await fetch(ENDPOINTS.DATA);
            if (res.ok) setData(await res.json());
        } catch (e) { console.error("Data poll error", e); }
    };

    const fetchHealth = async () => {
        try {
            const res = await fetch(ENDPOINTS.HEALTH);
            if (res.ok) {
                const h = await res.json();
                setHealth({ ...h, status: 'Online' });
            } else {
                setHealth(prev => ({ ...prev, status: 'Offline' }));
            }
        } catch (e) { 
            setHealth(prev => ({ ...prev, status: 'Offline' }));
        }
    };

    const fetchYoloAction = async () => {
        try {
            const res = await fetch(ENDPOINTS.CONTROL_YOLO);
            if (res.ok) setYoloAction(await res.json());
        } catch (e) { console.error("YOLO poll error", e); }
    };

    const fetchSummary = async () => {
        try {
            const res = await fetch(ENDPOINTS.SUMMARY);
            if (res.ok) setSummary(await res.json());
        } catch (e) { console.error("Summary poll error", e); }
    };

    const fetchAlerts = async () => {
        try {
            const res = await fetch(ENDPOINTS.ALERTS);
            if (res.ok) setAlerts(await res.json());
        } catch (e) { console.error("Alerts poll error", e); }
    };

    const fetchViolations = async () => {
        try {
            const res = await fetch(ENDPOINTS.VIOLATIONS);
            if (res.ok) setViolations(await res.json());
        } catch (e) { console.error("Violations poll error", e); }
    };

    const fetchEmergency = async () => {
        try {
            const res = await fetch(ENDPOINTS.EMERGENCY_GET);
            if (res.ok) setEmergency(await res.json());
        } catch (e) { console.error("Emergency poll error", e); }
    };

    const triggerEmergency = async (direction, active) => {
        try {
            const res = await fetch(ENDPOINTS.EMERGENCY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ direction, active })
            });
            if (res.ok) {
                fetchEmergency();
                fetchHealth();
            }
        } catch (e) { console.error("Emergency trigger error", e); }
    };

    const runSimStep = async () => {
        try {
            await fetch(ENDPOINTS.CONTROL_SUMO_STEP);
        } catch (e) {
            console.error("Auto-step failed", e);
            setAutoStep(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        fetchData();
        fetchYoloAction();
        fetchAlerts();
        fetchViolations();
        fetchEmergency();

        const dataInterval = setInterval(() => {
            fetchData();
            fetchYoloAction();
            fetchAlerts();
            fetchEmergency();
        }, 1000);

        const slowInterval = setInterval(() => {
            fetchHealth();
            fetchSummary();
            fetchViolations();
        }, health.sumo_running ? 1000 : 5000);

        return () => {
            clearInterval(dataInterval);
            clearInterval(slowInterval);
        };
    }, [health.sumo_running]);

    // Global Auto-Step Loop
    useEffect(() => {
        let interval;
        if (autoStep && health.sumo_running) {
            interval = setInterval(runSimStep, 1000);
        }
        return () => clearInterval(interval);
    }, [autoStep, health.sumo_running]);

    return (
        <TrafficContext.Provider value={{ 
            data, health, yoloAction, summary, 
            autoStep, setAutoStep,
            alerts, violations, emergency,
            triggerEmergency,
            refreshSummary: fetchSummary,
            refreshAlerts: fetchAlerts,
            refreshViolations: fetchViolations,
        }}>
            {children}
        </TrafficContext.Provider>
    );

};

export const useTraffic = () => useContext(TrafficContext);
