# api/client.ts Documentation

## Overview

`api/client.ts` initializes and exports a centralized Axios instance (`apiClient`) used for all HTTP communication between the React frontend and the FastAPI backend.

## Key Responsibilities

### 1. Configuration

- **Base URL**: Dynamically sets the API endpoint using the `VITE_API_URL` environment variable, with a default fallback to `http://localhost:8000`.
- **Headers**: Automatically includes `Content-Type: application/json` for all requests.
- **Timeout**: Sets a global request timeout of 10,000ms (10 seconds) to prevent hanging UI states.

### 2. Global Interceptors

- **Request Success**: A response interceptor extracts `response.data` automatically, allowing service functions to work directly with the JSON payload.
- **Global Error Handling**: Catches and logs API errors to the console, providing a unified location for debugging network-level issues.

## Usage

The `apiClient` should be used as the base for all specific service modules (e.g., `data.ts`, `logs.ts`) to ensure consistent configuration and error behavior.
