# webrtc_utils.py Documentation

## Overview

`webrtc_utils.py` contains the `VideoTransformTrack` class, which is a specialized `MediaStreamTrack` used by `aiortc` to stream video frames from the backend's frame processor to the frontend. It bridges the gap between OpenCV/NumPy arrays and the WebRTC media pipeline.

## Key Responsibilities

### 1. Custom Video Track

- **Media Kind**: Defined as "video" for the WebRTC stack.
- **Frame Transformation**: Converts OpenCV-style BGR NumPy arrays into `PyAV` `VideoFrame` objects, which are compatible with the WebRTC encoder.

### 2. Robust Frame Retrieval

- **Retry Logic**: Implements an iterative retry loop (`MAX_RECV_RETRIES`) with 10ms intervals. This ensures that brief dips in processing speed or lock contention don't cause the WebRTC stream to crash or drop frames.
- **Loop Avoidance**: Replaces recursive `recv()` calls with an iterative loop to prevent stack overflow errors during periods of high latency.
- **Fallback Mechanism**: If no frame is available after 3 seconds of retries, it returns a blank (black) 640x480 frame to keep the stream's heartbeat alive and prevent connection timeouts.

### 3. Timing & Pacing

- **Clock Rate**: Uses a standard 90,000 Hz clock rate (H.264 standard).
- **Target FPS**: Targets a consistent 30 FPS stream.
- **Pacing Logic**: Implements `next_timestamp()` to calculate precise Presentation Timestamps (PTS) and introduces micro-sleeps to ensure the stream maintains a steady playback pace for the client.

## Main Methods

- `__init__(get_frame_callback)`: Initializes the track with a callback function that retrieves the latest processed frame from the global state.
- `recv()`: The core asynchronous method called by `aiortc` to fetch the next frame in the stream.
- `next_timestamp()`: Calculates the monotonically increasing PTS and manages time-base fractions.

## Configuration Defaults

- **Max Retries**: 300 (approx. 3 seconds total wait).
- **Retry Interval**: 10ms.
- **Target Resolution (Fallback)**: 640 x 480.
