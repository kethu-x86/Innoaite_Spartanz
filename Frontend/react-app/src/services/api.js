import { ENDPOINTS } from '../config';

/**
 * Helper to handle fetch responses
 */
const handleResponse = async (response) => {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
    }
    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return response.text(); // Return text if not JSON
};

export const api = {
    // Traffic Data & Stats
    getData: () => fetch(ENDPOINTS.DATA).then(handleResponse),
    getHealth: () => fetch(ENDPOINTS.HEALTH).then(handleResponse),
    getSummary: () => fetch(ENDPOINTS.SUMMARY).then(handleResponse),
    getAlerts: () => fetch(ENDPOINTS.ALERTS).then(handleResponse),
    getViolations: () => fetch(ENDPOINTS.VIOLATIONS).then(handleResponse),

    // Comparison / Control
    getYoloAction: () => fetch(ENDPOINTS.CONTROL_YOLO).then(handleResponse),

    // SUMO Simulation Control
    startSumo: () => fetch(ENDPOINTS.CONTROL_SUMO_START).then(handleResponse),
    stepSumo: () => fetch(ENDPOINTS.CONTROL_SUMO_STEP).then(handleResponse),
    stopSumo: () => fetch(ENDPOINTS.CONTROL_SUMO_STOP).then(handleResponse),

    // Emergency Control
    getEmergency: () => fetch(ENDPOINTS.EMERGENCY_GET).then(handleResponse),
    setEmergency: (direction, active) => fetch(ENDPOINTS.EMERGENCY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, active })
    }).then(handleResponse),

    // Config / Mask
    setMask: (camId, points) => fetch(ENDPOINTS.SET_MASK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cam_id: camId, points })
    }).then(handleResponse),

    // WebRTC
    sendOffer: (sdp, type, camId) => fetch(ENDPOINTS.OFFER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp, type, cam_id: camId })
    }).then(handleResponse),
};
