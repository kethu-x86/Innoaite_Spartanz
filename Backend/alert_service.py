"""
Alert, Violation, and Emergency management for the traffic system.
Thread-safe in-memory stores with auto-expiry and severity classification.
"""
import threading
import time
import logging
from collections import deque
from datetime import datetime

logger = logging.getLogger(__name__)

# --- Severity Levels ---
SEVERITY_NORMAL = "normal"
SEVERITY_MODERATE = "moderate"
SEVERITY_HEAVY = "heavy"
SEVERITY_CRITICAL = "critical"

SEVERITY_ORDER = {
    SEVERITY_NORMAL: 0,
    SEVERITY_MODERATE: 1,
    SEVERITY_HEAVY: 2,
    SEVERITY_CRITICAL: 3,
}


class AlertEngine:
    """
    Generates severity-classified traffic alerts from metrics.
    Thresholds:
        - Normal:   queue < 5, waiting < 60s
        - Moderate: queue 5-10 OR waiting 60-180s
        - Heavy:    queue 10-20 OR waiting 180-360s
        - Critical: queue > 20 OR waiting > 360s
    """

    def __init__(self, junction_name="Kochi Junction", max_history=100):
        self.junction_name = junction_name
        self.lock = threading.Lock()
        self.history = deque(maxlen=max_history)
        self.current_alert = None

    def evaluate(self, metrics: dict) -> dict:
        """
        Evaluate traffic metrics and generate an alert if warranted.

        Args:
            metrics: dict with keys like 'queue_length', 'waiting_time',
                     'vehicle_count' (dict per direction)
        Returns:
            alert dict with severity, message, timestamp, metrics snapshot
        """
        queue = metrics.get("queue_length", 0)
        wait = metrics.get("waiting_time", 0)
        counts = metrics.get("vehicle_count", {})

        # Determine per-direction congestion
        direction_status = {}
        for d in ["North", "South", "East", "West"]:
            c = counts.get(d, 0) if isinstance(counts.get(d), (int, float)) else 0
            direction_status[d] = c

        # Find the most congested direction
        max_dir = max(direction_status, key=direction_status.get) if direction_status else "Unknown"
        # Classify severity
        severity = SEVERITY_NORMAL
        if queue > 20 or wait > 360:
            severity = SEVERITY_CRITICAL
        elif queue > 10 or wait > 180:
            severity = SEVERITY_HEAVY
        elif queue > 5 or wait > 60:
            severity = SEVERITY_MODERATE

        # Build human-readable message
        messages = {
            SEVERITY_NORMAL: f"Traffic flowing normally at {self.junction_name}.",
            SEVERITY_MODERATE: (
                f"Moderate congestion at {self.junction_name} {max_dir} approach: "
                f"queue {queue} vehicles, avg wait {wait:.0f}s."
            ),
            SEVERITY_HEAVY: (
                f"Heavy congestion at {self.junction_name} {max_dir} approach: "
                f"queue {queue} vehicles, average waiting time exceeds {wait:.0f} seconds. "
                f"Consider extending {max_dir} green phase."
            ),
            SEVERITY_CRITICAL: (
                f"CRITICAL congestion at {self.junction_name} {max_dir} approach: "
                f"queue {queue} vehicles, average waiting time exceeds {wait/60:.1f} minutes. "
                f"Immediate intervention recommended."
            ),
        }

        alert = {
            "severity": severity,
            "severity_level": SEVERITY_ORDER[severity],
            "message": messages[severity],
            "junction": self.junction_name,
            "direction": max_dir,
            "queue_length": queue,
            "waiting_time": round(wait, 1),
            "vehicle_counts": direction_status,
            "timestamp": datetime.now().isoformat(),
        }

        with self.lock:
            self.current_alert = alert
            # Only log non-normal alerts to history
            if severity != SEVERITY_NORMAL:
                self.history.appendleft(alert)

        return alert

    def get_current(self) -> dict:
        with self.lock:
            return self.current_alert or {
                "severity": SEVERITY_NORMAL,
                "message": "No traffic data available yet.",
                "timestamp": datetime.now().isoformat(),
            }

    def get_history(self, limit=50) -> list:
        with self.lock:
            return list(self.history)[:limit]


class ViolationTracker:
    """
    Tracks stationary vehicles per camera for illegal parking detection.
    A vehicle is flagged if its centroid doesn't move >15px for 120+ seconds.
    """

    def __init__(self, distance_threshold=15, time_threshold=120, max_violations=200):
        self.distance_threshold = distance_threshold
        self.time_threshold = time_threshold
        self.lock = threading.Lock()
        self.trackers = {}  # {cam_id: {track_key: {"pos": (cx,cy), "first_seen": t, "last_seen": t}}}
        self.violations = deque(maxlen=max_violations)

    def update(self, cam_id: str, detections: list):
        """
        Update tracker with new detections for a camera.

        Args:
            cam_id: camera identifier
            detections: list of (cx, cy, x1, y1, x2, y2) tuples
        """
        now = time.time()

        with self.lock:
            if cam_id not in self.trackers:
                self.trackers[cam_id] = {}

            tracker = self.trackers[cam_id]
            matched_keys = set()

            for det in detections:
                cx, cy = det[0], det[1]
                best_key = None
                best_dist = float("inf")

                # Find closest existing track
                for key, info in tracker.items():
                    ox, oy = info["pos"]
                    dist = ((cx - ox) ** 2 + (cy - oy) ** 2) ** 0.5
                    if dist < best_dist:
                        best_dist = dist
                        best_key = key

                if best_key is not None and best_dist < self.distance_threshold:
                    # Vehicle hasn't moved — update last_seen
                    tracker[best_key]["last_seen"] = now
                    tracker[best_key]["pos"] = (cx, cy)
                    matched_keys.add(best_key)

                    # Check if it's been stationary long enough
                    duration = now - tracker[best_key]["first_seen"]
                    if duration >= self.time_threshold and not tracker[best_key].get("flagged"):
                        tracker[best_key]["flagged"] = True
                        violation = {
                            "type": "illegal_parking",
                            "cam_id": cam_id,
                            "position": {"x": cx, "y": cy},
                            "duration": round(duration, 1),
                            "timestamp": datetime.now().isoformat(),
                            "severity": "warning" if duration < 180 else "critical",
                        }
                        self.violations.appendleft(violation)
                        logger.info(f"Violation detected: {violation}")
                else:
                    # New vehicle, not close to any existing track
                    new_key = f"{cam_id}_{cx}_{cy}_{int(now)}"
                    tracker[new_key] = {
                        "pos": (cx, cy),
                        "first_seen": now,
                        "last_seen": now,
                        "flagged": False,
                    }
                    matched_keys.add(new_key)

            # Prune stale tracks (not seen for 10 seconds)
            stale = [k for k, v in tracker.items() if now - v["last_seen"] > 10 and k not in matched_keys]
            for k in stale:
                del tracker[k]

    def get_violations(self, limit=100) -> list:
        with self.lock:
            return list(self.violations)[:limit]

    def get_active_stationary(self) -> dict:
        """Return currently tracked stationary vehicles per camera."""
        now = time.time()
        result = {}
        with self.lock:
            for cam_id, tracker in self.trackers.items():
                stationary = []
                for key, info in tracker.items():
                    duration = now - info["first_seen"]
                    if duration >= self.time_threshold:
                        stationary.append({
                            "position": info["pos"],
                            "duration": round(duration, 1),
                            "flagged": info.get("flagged", False),
                        })
                if stationary:
                    result[cam_id] = stationary
        return result


class EmergencyManager:
    """
    Manages emergency vehicle priority override.
    When active, signals the TrafficController to preempt the signal phase
    for the specified direction.
    """

    def __init__(self, timeout=120):
        self.lock = threading.Lock()
        self.active = False
        self.direction = None
        self.activated_at = None
        self.timeout = timeout  # seconds
        self.history = deque(maxlen=50)

    def activate(self, direction: str):
        with self.lock:
            self.active = True
            self.direction = direction
            self.activated_at = time.time()
            event = {
                "event": "emergency_activated",
                "direction": direction,
                "timestamp": datetime.now().isoformat(),
            }
            self.history.appendleft(event)
            logger.warning(f"🚨 EMERGENCY ACTIVATED: Priority for {direction} approach")

    def deactivate(self):
        with self.lock:
            if self.active:
                event = {
                    "event": "emergency_deactivated",
                    "direction": self.direction,
                    "timestamp": datetime.now().isoformat(),
                }
                self.history.appendleft(event)
                logger.info(f"Emergency deactivated for {self.direction}")
            self.active = False
            self.direction = None
            self.activated_at = None

    def get_state(self) -> dict:
        with self.lock:
            # Auto-expire
            if self.active and self.activated_at:
                elapsed = time.time() - self.activated_at
                if elapsed > self.timeout:
                    self.active = False
                    self.direction = None
                    self.activated_at = None
                    self.history.appendleft({
                        "event": "emergency_expired",
                        "timestamp": datetime.now().isoformat(),
                    })
                    logger.info("Emergency override auto-expired")

            return {
                "active": self.active,
                "direction": self.direction,
                "activated_at": datetime.fromtimestamp(self.activated_at).isoformat() if self.activated_at else None,
                "remaining_seconds": max(0, int(self.timeout - (time.time() - self.activated_at))) if self.active and self.activated_at else 0,
            }

    def get_priority_direction(self) -> str | None:
        """Returns the direction needing priority, or None if no emergency."""
        state = self.get_state()
        return state["direction"] if state["active"] else None

    def get_history(self) -> list:
        with self.lock:
            return list(self.history)
