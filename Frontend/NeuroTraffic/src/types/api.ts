export interface EmergencyRequest {
  direction: string;
  active: boolean;
}

export interface MaskConfig {
  cam_id: string;
  points: number[][]; // [x, y] coordinates
}

export interface WebRTCOffer {
  sdp: string;
  type: string;
  cam_id?: string | null;
}

// These interfaces are implicitly defined by the backend but needed for strict typing.
export interface TrafficData {
  North: { count: number; timestamp: string };
  South: { count: number; timestamp: string };
  East: { count: number; timestamp: string };
  West: { count: number; timestamp: string };
}

export interface YoloAction {
  action: number;
  state: {
    queue_north: number;
    queue_south: number;
    queue_east: number;
    queue_west: number;
  };
}

export interface SystemHealth {
  status: string;
  models_loaded: boolean;
  sumo_running: boolean;
  emergency_override: string | null;
}
