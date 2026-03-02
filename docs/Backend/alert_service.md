# alert_service.py Documentation

## Overview

`alert_service.py` provides thread-safe components for managing traffic alerts, detecting violations (like illegal parking), and handling emergency priority overrides. It acts as the "nervous system" of the backend, categorizing incidents by severity and managing temporal states (auto-expiry).

## Key Components

### 1. AlertEngine

The `AlertEngine` evaluates raw traffic metrics and generates human-readable alerts with associated severity levels.

- **Severity Levels**: `normal`, `moderate`, `heavy`, and `critical`.
- **Thresholds**: Based on queue lengths and average waiting times.
- **History Management**: maintains a deque of the most recent non-normal alerts for API reporting.

### 2. ViolationTracker

The `ViolationTracker` implements spatial-temporal logic to detect stationary vehicle violations (e.g., illegal parking).

- **Detection Logic**: Flags a vehicle if its centroid remains within a small radius (15px) for a specific duration (default 120s).
- **Pruning**: Automatically removes trackers for vehicles that haven't been seen for 10 seconds to save memory.
- **Reporting**: Categorizes violations into "warning" or "critical" based on the duration of the stationary event.

### 3. EmergencyManager

The `EmergencyManager` coordinates the manual or automatic activation of emergency priority signal cycles.

- **Activation**: Stores the direction needing priority (e.g., "North") and the activation timestamp.
- **Auto-Expiry**: Automatically deactivates the emergency override after a configurable timeout (default 120s) to prevent permanent signal lock.
- **Priority Signaling**: Provides a `get_priority_direction()` method used by the `TrafficController` to bypass AI logic.

## Thread Safety

All tracker and manager classes use `threading.Lock()` to ensure that updates from the background `processing_loop` and reads from FastAPI request threads do not result in race conditions.

## Data Structures

- **Deques**: Used for efficient fixed-length history storage (`max_history`).
- **ISO 8601 Timestamps**: All events are timestamped for frontend display and sorting.
