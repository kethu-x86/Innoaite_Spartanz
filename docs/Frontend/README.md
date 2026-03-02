---
layout: default
title: Frontend Overview
nav_order: 2
has_children: true
permalink: /Frontend/
---

# Frontend Overview - NeuroTraffic

The NeuroTraffic Frontend is a modern, responsive React 19 application built with TypeScript, Vite, and Tailwind CSS. It provides a real-time dashboard for traffic monitoring, simulation control, and historical data analysis.

## Key Features

- **Real-Time Data Streaming:** Uses WebRTC and `aiortc` to stream extremely low-latency video direct from the backend's frame processor, avoiding the delays of standard HLS or HTTP streaming.
- **Simulation Control Panel:** Provides direct controls to start, stop, and configure the SUMO backend simulation.
- **Dynamic Overlay System:** A custom HTML5 Canvas implementation (`SumoOverlay`) visualizes virtual vehicles and AI-driven traffic lights tightly synchronized with the live video feed.
- **Administrative Configuration:** Allows operators to draw custom Regional bounding boxes (Masks) directly onto the video feed to refine YOLO detection areas in real-time.
- **Interactive Dashboards:** Presents historical data trends using `Recharts` and live generative AI situation reports via the LLM integration.
- **Historical System Archive:** The `/logs` route provides a comprehensive, paginated view of historical traffic volumes, RL signal schedules, and logged violations.

## Key Components & Architecture

### Features

- **Dashboard**: The central landing page, combining multiple widgets:
  - `TrafficLogsTable`: Browsable log of recent detection events.
  - `HistoricalTrendChart`: Visual representation of vehicle volume over time.
- **Simulation**:
  - `WebRTCPlayer`: Handles the WebRTC signaling and playback for live camera feeds.
  - `SumoOverlay`: Layers virtual simulation data on top of the video feed.
  - `MaskConfig`: UI for drawing and saving lane-specific detection masks.

### API Layer

- **Client**: Centralized Axios client with error handling and environment-aware base URLs.
- **Services**: Modular service functions for interacting with simulation, data, logs, and WebRTC endpoints.

### UI System

- **Shadcn/UI**: Uses a curated set of accessible, high-performance components (Buttons, Cards, Tables, etc.) styled with Tailwind CSS.

## Technology Stack

- **Framework**: React 19 (Hooks, Functional Components)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Data Fetching**: Axios
- **Visualization**: Recharts, HTML5 Canvas
- **Type Safety**: TypeScript 5.0+
