# DQN Decision Layer: Smart Junction AI

This document defines the Reinforcement Learning (RL) framework for the Deep Q-Network (DQN) that controls the traffic signals, integrating predictive data from the LSTM model.

## 1. The State (Input Vector)
The DQN "observes" the intersection state every $X$ seconds. To be **predictive**, we combine real-time SUMO data with LSTM forecasts.

| Feature Type | Data Point | Source |
| :--- | :--- | :--- |
| **Reactive** | Queue Length (Vehicles stopped per lane) | SUMO (TraCI) |
| **Reactive** | Current Signal Phase (N-S Green vs E-W Green) | SUMO (TraCI) |
| **Predictive** | **Predicted Vehicle Count (T + 30m)** | **LSTM Model** |
| **Predictive** | **Congestion Score (T + 30m)** | **LSTM Model** |

## 2. The Action Space (Decisions)
The model chooses one of the following at each decision step:
*   **Action 0 (Stay):** Extend the current green light phase.
*   **Action 1 (Switch):** Initiate a phase change (triggers yellow light transition in SUMO).

## 3. The Reward Function (Optimization Goal)
The DQN learns by maximizing the Reward. We use a "Pressure-based" or "Waiting-time" penalty.
*   **Primary Reward:** `-(Total Waiting Time of all vehicles)`
*   **Penalty:** A small negative value if the model switches phases too frequently (to prevent "flickering" lights).

## 4. Training Workflow
1.  **Observe:** Get current queues from SUMO and future prediction from LSTM.
2.  **Predict:** DQN chooses the best action based on the state.
3.  **Act:** TraCI sends `setPhase` command to SUMO.
4.  **Reward:** Calculate the change in waiting time and update the DQN weights.

## 5. Summary Logic
The "Decision Engine" status will be sent to the Authority Dashboard:
*   *Example:* "Action: Extending North-South Green. Reason: High predicted inflow from North approach."
