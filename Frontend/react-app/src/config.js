export const API_BASE_URL = "http://100.107.46.86:8000";

export const ENDPOINTS = {
    DATA: `${API_BASE_URL}/data`,
    OFFER: `${API_BASE_URL}/offer`,
    SET_MASK: `${API_BASE_URL}/config/mask`,
    HEALTH: `${API_BASE_URL}/health`,
    CONTROL_YOLO: `${API_BASE_URL}/control/yolo`,
    CONTROL_SUMO_START: `${API_BASE_URL}/control/sumo/start`,
    CONTROL_SUMO_STEP: `${API_BASE_URL}/control/sumo/step`,
    CONTROL_SUMO_STOP: `${API_BASE_URL}/control/sumo/stop`,
    SUMMARY: `${API_BASE_URL}/summary`,
};
