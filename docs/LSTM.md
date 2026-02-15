# LSTM Training Data Requirements: Smart Junction AI

This document outlines the data necessary to train the LSTM forecasting model for the SUMO-based cross-intersection, as defined in the **Spartanz** project methodology.

## 1. Simplified Model Inputs (Time-Series)
To keep the model efficient, focus on volume-based metrics aggregated into fixed time intervals (e.g., 1-minute or 5-minute buckets).

*   **Vehicle Count (per Lane/Direction):** Total number of vehicles entering each approach (North, South, East, West).
*   **Time Index:** The time of day encoded numerically (e.g., 0–1439 for minutes in a day). This allows the LSTM to recognize cyclical patterns like morning and evening rush hours.
*   **Day of the Week:** (Optional) Integer (0-6) to distinguish between weekday and weekend traffic patterns.

## 2. Model Outputs (Predictions)
The LSTM model generates the following outputs, which are used both for the Authority Dashboard and as inputs for the DQN Decision Layer:

*   **Future Vehicle Count (T + 30m):** The predicted number of vehicles expected to be at each approach in 30 minutes.
*   **Congestion Score (T + 30m):** A normalized value (0.0 to 1.0) indicating predicted traffic density.
    *   *0.0–0.3:* Low Traffic
    *   *0.4–0.7:* Moderate Congestion
    *   *0.8–1.0:* Heavy Buildup (Gridlock)

## 3. Target Variable (Labels for Training)
Utilize SUMO's built-in tools to generate the training dataset without complex TraCI scripting:

### Induction Loops (E1 Detectors)
Place E1 detectors at the entry of each road in your `map.net.xml`. 
*   **Command:** Run the simulation using:
    `sumo -c map.sumocfg --induction-loop-output results.xml`
*   **Metric:** Use `nVehContrib` (number of vehicles that passed the detector in the interval).

## 4. Training Data Structure
The LSTM expects a 3D tensor shape: `[Samples, Time_Steps, Features]`.

| Feature | Description |
| :--- | :--- |
| **Look-back Window** | The last 30–60 minutes of historical counts used as input. |
| **Features** | [Current Count, Time Index, Day of Week]. |
| **Target** | [Count + 30 Minutes]. |

## 5. Summary Generation Logic
The output of the LSTM (predicted count) will feed the **Summarization Layer** mentioned in the project docs to generate human-readable reports:
*   *Example:* "Predicted count for North approach in 30 mins: 85 vehicles. Status: High Congestion."
