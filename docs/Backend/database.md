# database.py Documentation

## Overview

`database.py` manages the persistence layer for the NeuroTraffic system using SQLite. It defines the database schema and provides functions for logging real-time traffic data, signal schedules, and violations, as well as retrieving this data for reporting.

## Schema Definition

### 1. `INTERSECTION` Table

- `intersection_id` (PK): Unique identifier for the junction.
- `location_name`: Human-readable name (e.g., "NeuroTraffic").
- `gps_coords`: Latitude and longitude of the intersection.

### 2. `TRAFFIC_LOG` Table

- `log_id` (PK): Unique ID for the log entry.
- `intersection_id` (FK): Links to the intersection.
- `created_at`: ISO 8601 timestamp.
- `total_vehicle_count`: Aggregate count of vehicles across all directions.
- `north_density`, `south_density`, `east_density`, `west_density`: Raw counts for each approach.

### 3. `VIOLATION` Table

- `violation_id` (PK): Unique ID for the violation.
- `intersection_id` (FK): Links to the intersection.
- `occurred_at`: Timestamp of the violation.
- `violation_type`: Type of incident (e.g., "illegal_parking").
- `vehicle_plate_blob`: Placeholder for OCR/Plate data.
- `snapshot_path`: File path to the saved image of the violation.

### 4. `SIGNAL_SCHEDULE` Table

- `schedule_id` (PK): Unique ID for the schedule.
- `log_id` (FK): Links to the specific traffic log that triggered this schedule.
- `cycle_duration_seconds`: Total length of the traffic light cycle.
- `split_ratios`: JSON string containing the timing allocations for each phase.
- `is_emergency_override`: Boolean indicating if this was an AI decision or an emergency preemption.

## Core Functions

- `init_db()`: Initializes the database file (`traffic_data.db`), creates tables if they don't exist, and inserts the default intersection record.
- `log_traffic_and_schedule(...)`: Atomically logs both the input traffic counts and the resulting AI/Emergency signal schedule.
- `log_violation(...)`: Records a detected traffic violation.
- `get_traffic_logs(...)` / `get_signal_schedules(...)` / `get_violations(...)`: Provides paginated access to historical data for the frontend.

## Configuration

- **Database Path**: `traffic_data.db`
- **Thread Safety**: Uses `check_same_thread=False` in the SQLite connection to allow access from both the background processing thread and FastAPI's request threads.
