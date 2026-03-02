# NeuroTraffic: Intelligent Smart Traffic Control System

NeuroTraffic is a state-of-the-art, AI-driven traffic management system designed to reduce urban congestion and prioritize emergency services. By combining real-time computer vision, forecasting models, and reinforcement learning, the system optimizes traffic signal timings based on actual demand rather than static timers.

---

## 🚦 Key Features

- **Real-Time Detection**: Uses YOLOv8 to track vehicles across multiple camera feeds simultaneously.
- **Smart Signal Control**: Employs a Deep Q-Network (DQN) to make split-second decisions on signal changes.
- **Predictive Analytics**: An LSTM model forecasts near-future traffic volume to prevent congestion before it starts.
- **Low-Latency Streaming**: Monitor live feeds directly in the browser via WebRTC.
- **Emergency Priority**: Automatic and manual green-light preemption for emergency vehicles (Ambulances, Fire Trucks).
- **Interactive Simulation**: Full integration with the SUMO (Simulation of Urban MObility) engine for risk-free testing.
- **AI Narrative Reports**: Natural language summaries of traffic conditions powered by Large Language Models (LLM).

---

## 🏗️ Project Structure

```bash
.
├── Backend/           # FastAPI server, AI Models (YOLO, DQN, LSTM), and Database
├── Frontend/          # React 19 Dashboard, WebRTC Streaming, and UI Components
├── Docs/              # Comprehensive Project Documentation (Technical & Non-Technical)
├── Sim/               # SUMO Simulation configuration and map files
└── requirements.txt   # Global Python dependencies
```

---

## 📚 Documentation

We have prepared extensive documentation to help you understand, set up, and contribute to the project:

### Quick Start

- [**Setup & Installation Guide**](Docs/SETUP.md): Get the system running in minutes.
- [**Project Glossary**](Docs/GLOSSARY.md): Understand the technical terms we use.

### Deep Dives

- [**Machine Learning Deep Dive**](Docs/Backend/ml_deep_dive.md): A detailed look at how the AI "brains" (LSTM & DQN) work.
- [**Backend Overview**](Docs/Backend/README.md): Architecture and API details.
- [**Frontend Overview**](Docs/Frontend/README.md): Dashboard features and UI design.

---

## 🛠️ Technology Stack

- **Backend**: Python (FastAPI), PyTorch, OpenCV, SQLite, aiortc.
- **Frontend**: React 19 (TypeScript), Vite, Tailwind CSS, TanStack Query.
- **AI/ML**: YOLOv8 (Inference), DQN (Reinforcement Learning), LSTM (Time-Series Forecasting).
- **Simulation**: SUMO (Simulation of Urban MObility).

---

## 🚑 Emergency & Support

The system is designed with a "Safety-First" approach. In the event of a system failure, the traffic signals are programmed to revert to a standard timed cycle.

For technical support or feature requests, please refer to the [Detailed Documentation](Docs/README.md).
