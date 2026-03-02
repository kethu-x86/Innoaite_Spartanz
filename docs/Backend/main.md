# main.py Documentation

## Overview

`main.py` is the primary entry point for the NeuroTraffic Backend API. It initializes the FastAPI application, sets up the core processing services, and defines the RESTful and WebRTC endpoints used by the frontend.

## Key Responsibilities

### 1. API Initialization

- Configures the FastAPI app with metadata (title, version, description).
- Sets up CORS (Cross-Origin Resource Sharing) to allow frontend access.
- Implements a `lifespan` context manager for clean startup (DB init, ML thread start) and shutdown (WebRTC connection cleanup).

### 2. Global State Management

- Initializes core services: `FrameProcessor`, `StreamGenerator`, `TrafficController`, `SumoManager`, `TrafficNarrator`, and `AlertEngine`.
- Handles a `DISABLE_ML` mode for development/testing without GPU/model requirements.

### 3. Endpoints

#### General

- `GET /`: Root health check.
- `GET /data`: Returns latest vehicle counts for all directions.
- `GET /health`: Detailed system status (models, simulation, emergency state).

#### Configuration

- `POST /config/mask`: Updates the detection mask for a specific camera view.

#### Traffic Control & Simulation

- `GET /control/yolo`: Gets the optimal signal action based on live YOLO detections.
- `GET /control/sumo/start`: Initializes the SUMO simulation engine.
- `GET /control/sumo/step`: Executes a single step in the SUMO simulation, applying AI-driven actions.
- `GET /control/sumo/stop`: Safely terminates the SUMO simulation.

#### Emergency & Alerts

- `POST /control/emergency`: Activates/Deactivates manual emergency signal overrides.
- `GET /alerts`: Retrieves active and historical traffic alerts (collisions, etc.).
- `GET /violations`: Lists active and historical traffic violations (stationary vehicles, illegal parking).

#### AI Reporting

- `GET /summary`: Generates an LLM-powered natural language summary of the current traffic state.

#### WebRTC

- `POST /offer`: Signaling endpoint for establishing WebRTC video streams for camera feeds.

#### Database Reporting

- `GET /api/intersections`: Lists tracked intersections.
- `GET /api/logs/traffic`: Paginated access to historical traffic volume logs.
- `GET /api/logs/schedules`: Browses historical RL-generated signal schedules.

## Interaction Flow

1. **Startup**: `lifespan` initializes the database and starts the `processing_loop` in a background thread.
2. **Processing**: The background thread pulls frames from `StreamGenerator`, processes them via `FrameProcessor`, and updates a global `output_frame`.
3. **Consumption**: Frontend requests `GET /data` for counts or connects via WebRTC to view the `output_frame`.
4. **Control**: Frontend triggers `SUMO` simulation or requests signal timing logic via the control endpoints.
