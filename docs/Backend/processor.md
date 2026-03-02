---
layout: default
title: Frame Processor
nav_order: 6
parent: Backend Overview
---

# processor.py Documentation

## Overview

`processor.py` contains the `FrameProcessor` class, which is responsible for the core computer vision logic of the system. It handles image preprocessing, object detection using YOLOv8, and coordinate-based object tracking/counting.

## Key Responsibilities

### 1. Model Initialization

- Loads the YOLOv8 model (typically a TensorRT `.engine` file for performance).
- Sets up object classes for detection: Car (2), Truck (3), Bus (5), and Motorcycle (7).

### 2. Mask Management

- **Persistence**: Loads and saves polygon mask configurations to `mask.json`.
- **Application**: Creates binary masks from coordinate points and applies them to incoming frames using bitwise AND operations. This limits detection to specific regions of interest (e.g., specific traffic lanes).

### 3. Inference & Detection

- Runs the YOLO model on masked frames with a confidence threshold (default 0.4).
- Filters detections based on target vehicle classes.

### 4. Centroid-Based Counting

- Implements a simple centroid clustering algorithm to ensure vehicles are counted accurately within a processing batch.
- Uses a pixel distance threshold (30px) to distinguish between new and already-detected objects.

### 5. Visualization & Annotation

- Annotates frames with bounding boxes, centroids, camera IDs, batch IDs, and live vehicle counts.
- Displays the current mask status (MASKED or NO MASK) on the frame.

### 6. Violation & State Tracking

- Integrates with `ViolationTracker` to detect illegal parking or stationary vehicles.
- Updates the `latest_counts` global state with timestamped vehicle data for API consumption.

## Main Methods

- `__init__(model_path, mask_file)`: Initializes the YOLO model and loads existing masks.
- `update_mask(cam_id, points, frame_shape)`: Generates a new binary mask for a camera.
- `process(frame_data)`: The main pipeline method that takes raw frame data and returns an annotated frame and vehicle count.
- `load_masks()` / `save_masks()`: Handles JSON persistence for mask configurations.
