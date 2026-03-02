# Logs Dashboard Feature

## Overview

The Logs Dashboard (`src/features/logs/LogsDashboard.tsx`) provides a unified interface for system operators to browse historical data retained by the SQLite database via the FastAPI backend. It utilizes a tabbed interface to separate different categories of system logs.

## How it Works

The feature leverages `@tanstack/react-query` to fetch paginated data from the backend `logs.ts` API service. The data is requested in chunks (e.g., 50 records at a time) to minimize memory overhead when querying deep historical archives.

## Core Components

### 1. `LogsDashboard.tsx`

The primary container for the feature. It manages the `activeTab` state and renders the appropriate sub-view component based on user selection. It fits into the global "Brutalist" design language using high-contrast typography and borders.

### 2. `TrafficView.tsx`

Responsible for displaying historical traffic volume and directional density.

- **Data Source**: Fetches from `/api/logs/traffic`
- **Model**: `TrafficLog` interface.
- **Features**: Utilizes the shared `LogTable` UI component for consistent rendering.

### 3. `SchedulesView.tsx`

Displays the historical traffic light signal configurations requested by the Reinforcement Learning (RL) model or emergency overrides.

- **Data Source**: Fetches from `/api/logs/schedules`
- **Model**: `SignalSchedule` interface.
- **Features**: Safely formats complex JSON nested objects (`split_ratios`) into readable code blocks. Visually flags logs where `is_emergency_override` was true using `bg-red-400` tags.

### 4. `ViolationsView.tsx`

Displays logged infractions, specifically detected illegal stationery vehicles or incorrect turns.

- **Data Source**: Fetches from `/api/logs/violations`
- **Model**: `ViolationLog` interface.
- **Features**: Displays the snapshot evidence path and strongly emphasizes the `violation_type` field.

## State Management

Each sub-view independently manages its own `offset` state for pagination. The `useQuery` hook relies on the `offset` as part of its dependency array, meaning clicking "OLDER" automatically triggers a new network request for the next batch of rows.
