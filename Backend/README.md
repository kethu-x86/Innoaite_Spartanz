# Innoate: Smart Traffic Control Backend

Welcome to the backend of **Innoate**, a next-generation Smart Traffic Management System. This repository contains a high-performance Python backend built with FastAPI, integrating state-of-the-art Computer Vision, Reinforcement Learning, and Traffic Simulation to optimize urban mobility and enhance road safety.

---

## 🚀 Overview

The Innoate backend acts as the central intelligence hub for the traffic system. It ingests real-time video feeds, processes them using hardware-accelerated deep learning models, and makes split-second decisions to control traffic signals. It also features a digital twin simulation environment and an AI-powered reporting engine.

### Core Pillars

1.  **Vision Engine**: Real-time vehicle detection, tracking, and counting using YOLOv8 (TensorRT).
2.  **Adaptive Control**: A Reinforcement Learning (DQN) controller that optimizes green-light splits based on current demand.
3.  **Predictive Analytics**: LSTM-based congestion forecasting to anticipate traffic build-up.
4.  **Digital Twin**: Seamless integration with the SUMO (Simulation of Urban MObility) suite for testing and validation.
5.  **Interactive Communication**: WebRTC-based low-latency streaming and LLM-powered natural language summaries.

---

## 🛠️ Tech Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.org/) (Asynchronous Python Web Framework)
- **Computer Vision**: [Ultralytics YOLOv26](https://github.com/ultralytics/ultralytics), OpenCV, TensorRT (for NVIDIA GPU acceleration)
- **Machine Learning**: [PyTorch](https://pytorch.org/) (DQN & LSTM architectures), Scikit-learn (Scalers)
- **Simulation**: [SUMO](https://eclipse.dev/sumo/) (TraCI & sumolib)
- **Streaming**: [aiortc](https://github.com/aiortc/aiortc) (WebRTC implementation in Python)
- **Database**: SQLite3 with UUID-based logging
- **LLM Interface**: OpenAI SDK (compatible with local providers like LM Studio or Ollama)
- **Package Management**: [uv](https://github.com/astral-sh/uv) (Extremely fast Python package installer and resolver)

---

## 🏗️ System Architecture

The backend is designed with a modular, service-oriented architecture:

### 1. Perception Layer (`processor.py`, `stream_gen.py`)

- **`StreamGenerator`**: A multiplexed frame ingestor that handles multiple camera sources (RTSP, local video, or hardware cameras) in batches to balance processing load.
- **`FrameProcessor`**: The heart of the vision system. It applies user-defined polygon masks (via `mask.json`) to camera feeds and runs YOLOv8 inference. It uses a centroid-based clustering algorithm to verify detections and update real-time counts for the **North, East, West, and South** approaches.

### 2. Decision & Control Layer (`rl_inference.py`)

- **`TrafficController`**: Manages the inference lifecycle for the RL models.
  - **LSTM Prediction**: Analyzes the last 60 seconds of traffic history to predict short-term congestion indices.
  - **DQN (Deep Q-Network)**: A policy network that takes the current counts, predicted congestion, and current signal phase to decide whether to _Maintain_ or _Switch_ the current green light.
- **`SumoManager`**: Interfaces with the SUMO GUI. It translates AI decisions into simulation commands and extracts high-fidelity metrics (queue length, waiting time) for the feedback loop.

### 3. Safety & Alerting Layer (`alert_service.py`)

- **`AlertEngine`**: Evaluates traffic metrics against fuzzy thresholds to classify status into `NORMAL`, `MODERATE`, `HEAVY`, or `CRITICAL`.
- **`ViolationTracker`**: Detects stationary vehicles (illegal parking) by monitoring centroid displacement over time. If a vehicle remains within a 15px radius for >120 seconds, a violation is logged.
- **`EmergencyManager`**: Implements a "Green Corridor" priority override. It can be triggered manually via API or auto-detected from SUMO emergency vehicle markers.

### 4. Communication & Data Layer (`main.py`, `database.py`, `llm_service.py`)

- **FastAPI Routes**: Provides RESTful endpoints for the React frontend.
- **WebRTC Signaling**: Handles SDP offers/answers to stream annotated video tracks directly to the browser.
- **`TrafficNarrator`**: Periodically gathers system context (counts, alerts, metrics) and uses an LLM to generate a concise, human-readable situational report.
- **SQLite Logs**: Persists historical traffic density, signal schedules, and violation records.

---

## 🚦 Getting Started

### Prerequisites

- Python 3.13+
- NVIDIA GPU with CUDA 12.x support (recommended for TensorRT)
- SUMO installed and added to your system PATH (for simulation features)

### Installation

We recommend using `uv` for lightning-fast dependency resolution:

```bash
# Install uv if you haven't already
pip install uv

# Clone the repository and navigate to Backend
cd Innoate/Backend

# Create a virtual environment and sync dependencies
uv venv
uv sync
```

### Configuration

1.  **ML Models**: Ensure your `.pth` and `.engine` files are placed in `Backend/mlmodels/` and `Backend/models/` respectively.
2.  **LLM Support**: If using a local LLM (e.g., via LM Studio), ensure it's running on `http://127.0.0.1:1234`.
3.  **Environment Variables**:
    - `DISABLE_ML=1`: Run the backend in mock mode without loading PyTorch/YOLO (useful for UI development).
    - `LLM_BASE_URL`: Custom URL for the LLM API.

### Running the Server

```bash
# Activate virtual environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/macOS

# Start the FastAPI server
python main.py
```

The API will be available at `http://localhost:8000` with interactive docs at `/docs`.

---

## 📍 API Reference

### General

- `GET /`: Root health check.
- `GET /health`: Detailed system status (models, simulation, emergency).
- `GET /data`: Latest raw vehicle counts from cameras.

### Simulation & Control

- `GET /control/sumo/start`: Initialize the SUMO digital twin.
- `GET /control/sumo/step`: Advance simulation and execute AI-driven action.
- `GET /control/yolo`: Get AI recommendations based on live camera data (cached).

### Emergency & Alerts

- `POST /control/emergency`: Activate/Deactivate direction-based priority override.
- `GET /alerts`: Fetch current and historical traffic alerts.
- `GET /violations`: Retrieve detected illegal parking events.

### Reporting

- `GET /summary`: Generate an AI-narrated status report.
- `GET /api/logs/traffic`: Browse historic traffic volume data.
- `GET /api/logs/schedules`: Review AI signal timing decisions.

### WebRTC

- `POST /offer`: Signaling endpoint for live video streaming.

---

## 🧠 Model Specifications

### Q-Network (DQN)

- **Input (20 dims)**: Current counts (4), Time sin/cos (2), Day of Week (1), Count Deltas (4), Mean Counts (4), Predicted Congestion (4), Current Phase (1).
- **Architecture**: 4-layer MLP (256, 256, 128) with ReLU activation.
- **Output**: Q-values for 2 actions (Keep Phase, Switch Phase).

### Residual LSTM

- **Architecture**: Bi-directional LSTM with 3 layers and an Attention mechanism.
- **Input**: 60-second sliding window of 15 features.
- **Output**: 4-dimensional congestion prediction vector.

---

## 📝 License

This project is developed as part of the **Innoate** Smart City Initiative. All rights reserved.
