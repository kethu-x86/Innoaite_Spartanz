---
layout: default
title: Features
nav_order: 2
parent: Frontend Overview
---

# Frontend Features Documentation

This document describes the high-level features and component interactions within the NeuroTraffic Frontend.

## 1. Dashboard Feature (`/dashboard`)

The Dashboard is the primary monitoring interface for traffic authorities. It provides a real-time overview of the system's state.

### Dashboard.tsx

- **Real-Time Polling**: Uses `@tanstack/react-query` to poll `/data` every 2 seconds for live vehicle counts.
- **System Health**: Displays the status of ML models, SUMO simulation, and any active emergency overrides.
- **AI Summary**: Integrates the `getSummary` API to display a natural language report of current conditions.
- **Navigation Controls**: Provides buttons to toggle between different views and camera feeds.

### TrafficLogsTable.tsx

- **Historical Context**: Displays a list of recent traffic counts and events fetched from the database logs.
- **Pagination**: Supports browsing deep into historical data using limit/offset controls.

### HistoricalTrendChart.tsx

- **Visualization**: Uses `Recharts` to plot vehicle volume over time.
- **Data Density**: Handles multiple data series (North, South, East, West) to show directional congestion trends.

## 2. Simulation & Control Feature (`/simulation`)

The Simulation Panel is a specialized view for interacting with the SUMO engine and configuring the computer vision system.

### SimulationPanel.tsx

- **State Management**: Orchestrates the start/stop/step lifecycle of the SUMO simulation via `simulationApi`.
- **Primary Player**: Hosts the `WebRTCPlayer` and the interactive `SumoOverlay`.
- **Emergency UI**: Provides quick-action buttons to activate/deactivate emergency priority overrides.

### WebRTCPlayer.tsx

- **Streaming**: Implements the WebRTC handshake (offer/answer) to stream low-latency video from the backend.
- **Media Management**: Handles the `RTCPeerConnection` lifecycle, including ICE gathering and track assignment.

### SumoOverlay.tsx

- **Canvas Rendering**: Uses an HTML5 Canvas to draw virtual vehicles and traffic light phases.
- **Data Mapping**: Translates raw simulation coordinates and lane positions into visual elements layered precisely over the video feed.

### MaskConfig.tsx

- **Interactive Drafting**: Allows users to draw polygon ROI (Region of Interest) masks by clicking on the video feed.
- **Persistence**: Sends mask coordinates to the `/config/mask` backend endpoint to focus detection on specific lanes.
