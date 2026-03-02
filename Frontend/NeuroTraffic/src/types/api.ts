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

// Historical Log Types mapping to SQLite schema
export interface TrafficLog {
  log_id: string;
  intersection_id: string;
  created_at: string;
  total_vehicle_count: number;
  north_density: number;
  south_density: number;
  east_density: number;
  west_density: number;
}

export interface SignalSchedule {
  schedule_id: string;
  log_id: string;
  log_time?: string;
  cycle_duration_seconds: number;
  split_ratios: Record<string, number> | string;
  is_emergency_override: boolean | number;
}

export interface ViolationLog {
  violation_id: string;
  intersection_id: string;
  occurred_at: string;
  violation_type: string;
  vehicle_plate_blob: string | null;
  snapshot_path: string | null;
}
