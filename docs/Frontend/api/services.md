---
layout: default
title: API Services
nav_order: 1
parent: Frontend Overview
---

# API Services Documentation

This document provides an overview of the modular service functions used to interact with the NeuroTraffic Backend. All services utilize the centralized `apiClient`.

## 1. data.ts (Data API)

Manages real-time traffic data and system health monitoring.

- `getTrafficData()`: Fetches live vehicle counts (`/data`).
- `getHealth()`: Retrieves system operational status (`/health`).
- `getSummary()`: Gets the LLM-generated natural language report (`/summary`).
- `getAlerts()`: Fetches current and historical traffic alerts (`/alerts`).
- `getViolations()`: Fetches live violation data (`/violations`).
- `getYoloAction()`: Requests the optimal signal action based on YOLO counts (`/control/yolo`).

## 2. logs.ts (Historical Logs API)

Provides access to historical data stored in the SQLite database, returning strongly typed arrays matching the database schema.

- `getTrafficLogs(limit, offset)`: Retrieves paginated historical traffic density records (`TrafficLog[]`).
- `getSchedules(limit, offset)`: Retrieves paginated historical Reinforcement Learning signal generation schedules and emergency overrides (`SignalSchedule[]`).
- `getViolationsLogs(limit, offset)`: Retrieves paginated historical infraction logs, including timestamps and snapshot paths (`ViolationLog[]`).

## 3. simulation.ts (Simulation & Emergency API)

Controls the SUMO simulation engine and manual emergency overrides.

### simulationApi

- `start()`: Initializes the SUMO environment (`/control/sumo/start`).
- `step()`: Advances the simulation by one tick and returns metrics (`/control/sumo/step`).
- `stop()`: Terminates the simulation (`/control/sumo/stop`).

### emergencyApi

- `getEmergencyState()`: Checks the current priority override status (`/control/emergency`).
- `setEmergencyPriority(payload)`: Manually activates/deactivates directional priority (`/control/emergency`).

## 4. webrtc.ts (WebRTC & Config API)

Manages video streaming signaling and system configuration.

### webrtcApi

- `sendOffer(sdp, type, camId)`: Sends an SDP offer to initialize a WebRTC video stream (`/offer`).

### configApi

- `setMask(payload)`: Updates the detection mask/ROI for a specific camera (`/config/mask`).
