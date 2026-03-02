---
layout: default
title: ML Deep Dive
nav_order: 1
parent: Backend Overview
---

# Machine Learning Deep Dive - LSTM & DQN

This document provides a comprehensive, beginner-friendly explanation of the two primary AI models powering the NeuroTraffic Smart Traffic Control system: the **LSTM** (Forecaster) and the **DQN** (Decision Maker).

---

## 1. The Forecaster: Residual LSTM

**Purpose**: To predict how traffic volume will change in the near future (the next few minutes) based on what has happened in the last hour.

### What is an LSTM?

LSTM stands for **Long Short-Term Memory**. Think of it like a human dispatcher who has a "short-term memory" of the last few vehicles but can also remember "long-term patterns" (like rush hour starting at 8:00 AM).

### Architecture (The "Brain" Structure)

- **Bi-Directional Layers**: The model looks at the traffic data both forward (what happened first) and backward (what happened most recently) to understand trends better.
- **3-Layer Depth**: It has three "floors" of processing, allowing it to catch complex patterns that a simpler model would miss.
- **Attention Mechanism**: Just like a driver focuses more on the car directly in front than a car three lanes over, the "Attention" layer tells the AI which specific minutes in the past hour are most important for predicting the future.
- **Residual Connections**: These are "shortcuts" in the network that help information travel through the brain faster without getting lost or "fading away" (solving the vanishing gradient problem).

### Inputs (What it sees)

The LSTM looks at **15 different values** every second:

1.  **Raw Counts (4)**: How many cars are North, South, East, and West _right now_.
2.  **Time of Day (2)**: Represented as Sine and Cosine waves (this tells the AI if it's 2 AM or 5 PM).
3.  **Day of Week (1)**: Tells the AI if it's a weekday (work traffic) or weekend.
4.  **Directional Deltas (4)**: The change in traffic since the last check (Is it getting busier or quieter?).
5.  **Directional Means (4)**: The average traffic over the last 10 minutes (filtering out "noise").

### Outputs (What it predicts)

- It outputs **4 values**: The predicted number of vehicles for each direction (N, S, E, W) in the upcoming cycle.

---

## 2. The Decision Maker: Deep Q-Network (DQN)

**Purpose**: To decide whether to keep the current green light or switch it to another direction to minimize wait times.

### What is a DQN?

DQN stands for **Deep Q-Network**. It is a form of **Reinforcement Learning**.

- Imagine training a dog: if he sits, he gets a treat (Reward).
- The DQN is "rewarded" when the total waiting time for all cars at the junction goes down.
- Over millions of simulations (using SUMO), it learns the best "math" (Q-values) to get the highest reward.

### Architecture (The "Logic" Center)

It is a "Feed-Forward" network with 4 layers:

1.  **Layer 1 (256 Neurons)**: Takes the input and starts looking for relationships.
2.  **Layer 2 (256 Neurons)**: Deepens the logic.
3.  **Layer 3 (128 Neurons)**: Begins narrowing down the possibilities.
4.  **Layer 4 (2 Neurons)**: The final "Vote" (High score for "Keep" or "Switch").

### Inputs (The "State" - 20 Values)

The DQN doesn't just look at the camera; it looks at a "Summary" prepared by the rest of the system:

- **Current Features (15)**: The same 15 values the LSTM uses (Current counts, Time, etc.).
- **LSTM Predictions (4)**: The DQN "listens" to what the LSTM thinks will happen next.
- **Current Signal Phase (1)**: It needs to know which light is green right now!

### Output (The "Action")

- **Action 0 (Keep)**: The traffic light stays exactly as it is.
- **Action 1 (Switch)**: The light begins the yellow transition to give green to the crossing traffic.

---

## 3. How They Work Together (The Pipeline)

1.  **Eyes (YOLO)**: Detects cars and sends numbers to the system.
2.  **Memory (LSTM)**: Sees the numbers and says: _"Hey, North is getting really busy, expect 20 more cars soon!"_
3.  **Brain (DQN)**: Listens to the "Eyes" and "Memory" and thinks: _"North is busy, and Memory says it's getting worse. I should switch the light to Green for North."_
4.  **Execution (SUMO/Real-World)**: The signal changes, traffic flows, and the DQN gets its "Reward" for making people wait less.

## Summary for "Idiots"

- **YOLO**: "There are 5 cars there."
- **LSTM**: "I bet there will be 10 cars there in a minute."
- **DQN**: "Should I change the light? Yes, because 10 cars is a lot."
