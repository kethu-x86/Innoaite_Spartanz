# App.tsx Documentation

## Overview

`App.tsx` is the root component of the NeuroTraffic Frontend application. It defines the application's overall structure, including the routing system, global navigation, and the core context providers.

## Key Responsibilities

### 1. Global Context Provisioning

Sets up essential providers to manage state and data fetching across the app:

- **`QueryClientProvider`**: Integrates `@tanstack/react-query` for efficient, cached server-state management.
- **`SimulationProvider`**: Wraps the application in a custom context (`useSimulation`) to handle shared state related to SUMO simulation control and real-time visualization.

### 2. Routing Logic

Uses `react-router-dom` to manage navigation between distinct functional areas:

- **`Redirect (/)`**: Automatically sends users to the `/dashboard` upon entry.
- **`/dashboard`**: Renders the `Dashboard` component (Main monitoring view).
- **`/simulation`**: Renders the `SimulationPanel` (Control & specialized visualization).

### 3. Layout and Navigation

Defines a persistent "Brutalist" sidebar that remains visible across all views:

- **Brand Identity**: Displays the "NeuroTraffic v1.0.0-STC" logo and versioning.
- **Navigation Links**: Provides quick access to the Dashboard and Simulation views.
- **Main Content Area**: A responsive container (`flex-1`) that scrolls independently and hosts the routed components.

## Component Structure

```tsx
<QueryClientProvider>
  <SimulationProvider>
    <BrowserRouter>
      <div>
        <nav> (Sidebar) </nav>
        <main> (Routed Views) </main>
      </div>
    </BrowserRouter>
  </SimulationProvider>
</QueryClientProvider>
```

## Styling

- Implements a high-contrast "Dark Mode" theme using Tailwind CSS classes:
  - Background: `bg-brand-black`
  - Sidebar: `bg-brand-darkgray`
  - Accents: `text-brand-green`, `border-brand-gray`
