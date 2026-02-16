import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

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
    const [simSpeed, setSimSpeed] = useState(1000); // Default 1s

    const sumoRunningRef = useRef(health.sumo_running);
    useEffect(() => {
        sumoRunningRef.current = health.sumo_running;
    }, [health.sumo_running]);

    const fetchData = useCallback(async () => {
        try {
            const res = await api.getData();
            setData(res);
        } catch (e) { console.error("Data poll error", e); }
    }, []);

    const fetchHealth = useCallback(async () => {
        try {
            const h = await api.getHealth();
            setHealth({ ...h, status: 'Online' });
        } catch (e) {
            setHealth(prev => ({ ...prev, status: 'Offline' }));
        }
    }, []);

    const fetchYoloAction = useCallback(async () => {
        try {
            const res = await api.getYoloAction();
            setYoloAction(res);
        } catch (e) { console.error("YOLO poll error", e); }
    }, []);

    const fetchSummary = useCallback(async () => {
        try {
            const res = await api.getSummary();
            setSummary(res);
        } catch (e) { console.error("Summary poll error", e); }
    }, []);

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await api.getAlerts();
            setAlerts(res);
        } catch (e) { console.error("Alerts poll error", e); }
    }, []);

    const fetchViolations = useCallback(async () => {
        try {
            const res = await api.getViolations();
            setViolations(res);
        } catch (e) { console.error("Violations poll error", e); }
    }, []);

    const fetchEmergency = useCallback(async () => {
        try {
            const res = await api.getEmergency();
            setEmergency(res);
        } catch (e) { console.error("Emergency poll error", e); }
    }, []);

    const triggerEmergency = useCallback(async (direction, active) => {
        try {
            await api.setEmergency(direction, active);
            fetchEmergency();
            fetchHealth();
        } catch (e) { console.error("Emergency trigger error", e); }
    }, [fetchEmergency, fetchHealth]);

    const runSimStep = useCallback(async () => {
        try {
            const metrics = await api.stepSumo();
            
            // Update state immediately to reflect simulation step
            if (metrics) {
                setData(metrics.vehicle_count || {});
                
                setYoloAction({ 
                    action: metrics.action, 
                    source: 'SUMO',
                    counts: metrics.vehicle_count
                });

                // Patch summary for overlay visualization
                setSummary(prev => {
                    const newSummary = prev ? { ...prev } : {};
                    // Ensure structure exists
                    if (!newSummary.context) newSummary.context = {};
                    if (!newSummary.sumo) newSummary.sumo = {};
                    
                    // Update viz data
                    newSummary.sumo = { 
                        ...newSummary.sumo, 
                        ...metrics,
                        viz: metrics.viz 
                    };
                    
                    return newSummary;
                });
            }
        } catch (e) {
            console.error("Auto-step failed", e);
            setAutoStep(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchHealth();
        fetchData();
        fetchYoloAction();
        fetchAlerts();
        fetchViolations();
        fetchEmergency();
        fetchSummary();
    }, [fetchHealth, fetchData, fetchYoloAction, fetchAlerts, fetchViolations, fetchEmergency, fetchSummary]);

    // Data polling (1s)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
            fetchYoloAction();
            fetchAlerts();
            fetchEmergency();
        }, 1000);
        return () => clearInterval(interval);
    }, [fetchData, fetchYoloAction, fetchAlerts, fetchEmergency]);

    // Slow polling (varies)
    useEffect(() => {
        const poll = () => {
            fetchHealth();
            fetchViolations();
            const delay = sumoRunningRef.current ? 1000 : 5000;
            timeoutId = setTimeout(poll, delay);
        };
        let timeoutId = setTimeout(poll, 5000);
        return () => clearTimeout(timeoutId);
    }, [fetchHealth, fetchViolations]);

    // Summary polling (60s)
    useEffect(() => {
        const interval = setInterval(fetchSummary, 60000);
        return () => clearInterval(interval);
    }, [fetchSummary]);

    // Global Auto-Step Loop
    useEffect(() => {
        let interval;
        if (autoStep && health.sumo_running) {
            interval = setInterval(runSimStep, simSpeed);
        }
        return () => clearInterval(interval);
    }, [autoStep, health.sumo_running, runSimStep, simSpeed]);

    return (
        <TrafficContext.Provider value={{
            data, health, yoloAction, summary,
            autoStep, setAutoStep,
            alerts, violations, emergency,
            triggerEmergency,
            simSpeed, setSimSpeed,
            refreshSummary: fetchSummary,
            refreshAlerts: fetchAlerts,
            refreshViolations: fetchViolations,
        }}>
            {children}
        </TrafficContext.Provider>
    );

};

export const useTraffic = () => useContext(TrafficContext);
