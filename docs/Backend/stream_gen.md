# stream_gen.py Documentation

## Overview

`stream_gen.py` contains the `StreamGenerator` class, which manages video ingestion for the NeuroTraffic system. It is designed to handle multiple video sources (IP cameras, webcaps, or video files) and multiplex them into a single stream for the inference engine to process in batches.

## Key Responsibilities

### 1. Multiplexed Streaming

- **Batching**: Yields a configurable number of frames (`batch_size`) from one camera before switching to the next. This allows the system to process multiple "virtual" streams using a single inference pipeline.
- **Switching**: Automatically cycles through all initialized video sources in a round-robin fashion.

### 2. Source Initialization

- **Mixed Sources**: Supports integer indices (local webcams) and string paths (video files or RTSP streams).
- **Windows Compatibility**: Uses `cv2.CAP_DSHOW` on Windows systems to ensure stable camera initialization.
- **Resource Reuse**: Prevents opening the same physical source multiple times if it is assigned to different labels.

### 3. Dummy/Offline Fallback

- **Dummy Source**: If a source is explicitly marked as "dummy", it generates a synthetic frame (moving green circle on a black background) to simulate a live feed.
- **Connection Loss**: Automatically falls back to a "CAM OFFLINE" dummy frame if a `VideoCapture` object fails to open or read.

### 4. Frame Normalization

- **Resizing**: Resizes all incoming frames to a consistent `target_size` (default 640x640) before yielding them, ensuring compatibility with the YOLOv8 model's input requirements.

## Main Methods

- `__init__(sources, labels, batch_size, target_size)`: Initializes the multiplexer with the specified sources and configuration.
- `generate()`: A generator method that infinite-loops through the sources, yielding frames as dictionaries containing the raw frame, `cam_id`, and `batch_id`.
- `release()`: Safely closes all `VideoCapture` objects to free up hardware resources.

## Configuration Defaults

- **Batch Size**: 4 frames per camera.
- **Target Size**: 640 x 640.
- **FPS Simulation**: ~30 FPS for dummy/offline frames.
