// Hardcoded lab IP for cases where hostname resolution might fail or for direct dev
const LAB_IP = "100.107.46.86";
const FALLBACK_URL = `http://${LAB_IP}:8000`;

export const API_BASE_URL = "http://localhost:8000";

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
  ALERTS: `${API_BASE_URL}/alerts`,
  VIOLATIONS: `${API_BASE_URL}/violations`,
  EMERGENCY: `${API_BASE_URL}/control/emergency`,
  EMERGENCY_GET: `${API_BASE_URL}/control/emergency`,
};
