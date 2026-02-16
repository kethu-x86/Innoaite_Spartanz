const getBackendUrl = () => {
  // If we're on localhost, we might be developing, so try to find the backend
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:8000";
  }
  // Fallback to the lab IP but allow dynamic host if served by backend
  return `http://${window.location.hostname}:8000`;
};

// Hardcoded lab IP for cases where hostname resolution might fail or for direct dev
const LAB_IP = "100.107.46.86";
const FALLBACK_URL = `http://${LAB_IP}:8000`;

export const API_BASE_URL =
  window.location.port === "8000"
    ? "" // Relative if served by the backend itself
    : window.location.hostname === "localhost"
      ? "http://100.107.46.86:8000" // Forced remote IP as per user request
      : FALLBACK_URL;

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
