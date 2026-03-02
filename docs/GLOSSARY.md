# NeuroTraffic Project Glossary

This glossary explains technical terms and acronyms used throughout the NeuroTraffic project for easy reference.

## Machine Learning & AI

- **YOLO (You Only Look Once)**: A fast and accurate AI model used to detect objects (like cars, trucks, and buses) in video frames in real-time.
- **DQN (Deep Q-Network)**: A type of "Reinforcement Learning" brain that learns the best actions to take (like changing a traffic light) to get the best result (reducing traffic jams).
- **LSTM (Long Short-Term Memory)**: A type of AI that is very good at understanding "sequences" or "trends" over time. We use it to predict future traffic.
- **Inference**: The process of a trained AI "thinking" or "detecting" based on new data.
- **Centroid**: The geometric center of a detected object (represented as a single dot). We track these dots to count cars.
- **ROI (Region of Interest)**: The specific part of a video frame the AI is looking at (controlled by our "Masks").

## Simulation

- **SUMO (Simulation of Urban MObility)**: A powerful open-source engine that simulates virtual city traffic. We use it to test our AI before putting it on real streets.
- **TraCI (Traffic Control Interface)**: The "bridge" or "language" that our Python code uses to talk to and control the SUMO simulation.
- **Phase**: A specific state of a traffic light (e.g., "North-South Green, East-West Red").

## Networking & Streaming

- **WebRTC (Web Real-Time Communication)**: A technology that allows high-quality video to be streamed directly from the backend to your web browser with almost zero delay (lag).
- **SDP (Session Description Protocol)**: The "handshake" or "introduction" digital document that two computers exchange to start a WebRTC video stream.
- **FastAPI**: The high-speed "engine" that runs our Backend and allows the Frontend to ask for data.

## Traffic Specifics

- **Preemption**: Forcing a traffic light to turn green immediately for an emergency vehicle (like an ambulance).
- **Masking**: Drawing a shape on a camera feed to tell the AI: "Only look for cars inside this box and ignore everything else (like trees or sidewalks)."
