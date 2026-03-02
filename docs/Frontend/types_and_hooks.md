---
layout: default
title: Types & Hooks
nav_order: 4
parent: Frontend Overview
---

# Frontend Types & Hooks Documentation

## 1. types/api.ts

This file contains the TypeScript interface and type definitions that mirror the Backend's data structures.

- **`TrafficData`**: Defines the shape of the `/data` response (per-direction counts and timestamps).
- **`YoloAction`**: The expected schema natively returned by the `/control/yolo` API.
- **`SystemHealth`**: Type definitions for the `/health` diagnostic endpoint.
- **`TrafficLog`**: Interface mirroring the `TRAFFIC_LOG` SQLite table for historical traffic volumes.
- **`SignalSchedule`**: Interface mirroring the `SIGNAL_SCHEDULE` SQLite table for historical AI signal actions.
- **`ViolationLog`**: Interface mirroring the `VIOLATION` SQLite table for recorded infractions.
- **`EmergencyRequest`**: Schema for sending priority override commands.
- **`MaskConfig`**: Defines the `cam_id` and array of points for detection ROI.
- **`YoloAction`**: Interface for RL-generated signal timing recommendations.

## 2. hooks/useSimulation.tsx

A custom hook and context provider that encapsulates the complex logic of simulation state management.

- **Shared State**:
  - `isSimRunning`: Boolean flag for SUMO state.
  - `simMetrics`: The latest data returned from a simulation step (queue lengths, position data).
  - `activeCam`: Tracks which camera feed is currently being displayed.
- **Methods**:
  - `toggleSim()`: Handles starting and stopping the simulation.
  - `stepSim()`: Manages the periodic calling of the `/step` endpoint.
  - `setEmergency(direction)`: Simplifies calling the emergency API from any child component.
- **Auto-Sync**: Automatically updates the global metrics state, ensuring that the `SumoOverlay` and `Dashboard` widgets remain in sync without prop drilling.
