# llm_service.py Documentation

## Overview

`llm_service.py` provides the `TrafficNarrator` class, which integrates Large Language Models (LLMs) into the NeuroTraffic system. Its purpose is to transform complex, multi-dimensional traffic data into human-readable, actionable natural language summaries for traffic authorities.

## Key Responsibilities

### 1. LLM Client Initialization

- Uses the `openai` Python library to interface with LLM providers (configured for local servers like LM Studio by default).
- Supports environment variable overrides for `LLM_BASE_URL` and `LLM_API_KEY`.
- Uses a default model: `lfm2.5-1.2b-instruct`.

### 2. Context Aggregation

- Collects data from various system components:
  - **YOLO**: Real-time vehicle counts per direction.
  - **RL**: Averaged counts and the AI-calculated congestion index.
  - **SUMO**: Simulation-specific queue lengths and wait times.
  - **Alerts**: Current severity and incident messages (e.g., collisions).
  - **Violations**: Number of active traffic violations.
  - **Emergency**: Active priority overrides and directions.

### 3. Prompt Engineering

- Implements `_construct_prompt()` to format raw JSON context into a structured, descriptive text prompt.
- Uses a specialized system prompt to ensure the output is concise (under 80 words), professional, and highlights critical information like emergency vehicles or high congestion.

## Main Methods

### `generate_summary(context, junction_name)`

- The primary public method called by the `/summary` API endpoint.
- Sends the constructed prompt to the LLM and returns the generated text.
- Includes error handling to return a "service unavailable" message if the LLM connection fails.

## Configuration Defaults

- **Base URL**: `http://127.0.0.1:1234/v1`
- **Temperature**: `0.7` (balances creativity and factual consistency)
- **Max Tokens**: `150`
