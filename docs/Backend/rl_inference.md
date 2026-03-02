# rl_inference.py Documentation

## Overview

`rl_inference.py` implements the intelligent decision-making core of the NeuroTraffic system. It combines Reinforcement Learning (DQN) for signal control, LSTM for traffic forecasting, and the integration logic for the SUMO simulation engine.

## Key Components

### 1. Neural Network Architectures

- **`QNetwork`**: A Deep Q-Network (DQN) that takes a state vector (vehicle counts, congestion trends, current signal phase) and outputs Q-values for traffic light actions (Keep Phase vs. Switch Phase).
- **`ResidualLSTM`**: A sophisticated LSTM model with an attention mechanism and residual connections, used to forecast traffic congestion and trends based on historical volume data.

### 2. TrafficController Class

The `TrafficController` manages the state and inference logic for the signal control AI.

- **Model Loading**: Loads pre-trained PyTorch models (`dqn_active_model.pth`, `lstmv1.pth`) and their associated scalers (`scaler_x.pkl`, `scaler_y.pkl`).
- **Feature Engineering**: Computes complex feature vectors from raw vehicle counts, including time-of-day (sine/cosine), day-of-week, and directional deltas/means.
- **Action Selection**: Determines the optimal signal action.
- **Emergency Preemption**: Includes a bypass mechanism that overrides AI decisions to prioritize green lights for emergency vehicle directions.

### 3. SumoManager Class

The `SumoManager` handles the lifecycle and synchronization of the SUMO simulation engine.

- **Lifecycle Management**: Starts (`sumo-gui` or `sumo`), steps, and stops the simulation.
- **Data Synchronization**: Bridges the gap between SUMO's virtual sensors (induction loops) and the `TrafficController`.
- **Metrics Extraction**: Retrieves queue lengths, waiting times, and vehicle positions for frontend visualization.
- **Emergency Detection**: Automatically detects emergency vehicles within the simulation and triggers the emergency manager.

## Main Algorithms & Logic

- **State Discovery**: The state consists of 20 elements, including live counts, historical averages, and forecasted congestion.
- **Inference Pipeline**:
  1. Collect counts from YOLO or SUMO.
  2. Run LSTM to predict congestion.
  3. Construct a 20-element state vector.
  4. Run DQN to select the optimal control action (Switch/Keep).
- **Emergency Logic**: Maps signal phases to specific directions to ensure a "preempt green" state during emergency overrides.

## Dependencies

- `torch`: For neural network inference.
- `traci` / `sumolib`: For interfacing with the SUMO engine.
- `joblib`: For loading data scalers.
- `pandas` / `numpy`: For data manipulation and feature computation.
