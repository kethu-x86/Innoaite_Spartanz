import cv2
import numpy as np
from ultralytics import YOLO
import logging
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FrameProcessor:
    def __init__(self, model_path="./models/yolo26l.engine", mask_file="mask.json"):
        """
        Handles frame processing: masking, detection, and counting.
        """
        self.model = YOLO(model_path)
        self.mask_file = mask_file
        self.masks = {} # {cam_id: binary_mask}
        self.mask_configs = {} # {cam_id: points} for persistence
        
        # Batch state
        self.current_batch_id = -1
        self.batch_centroids = [] # List of (cx, cy)
        self.batch_count = 0
        
        # Global state for API
        self.latest_counts = {} # {cam_id: {"count": int, "timestamp": str}}
        
        self.load_masks()

    def load_masks(self):
        """Load mask configurations from JSON file."""
        if os.path.exists(self.mask_file):
            try:
                with open(self.mask_file, 'r') as f:
                    self.mask_configs = json.load(f)
                    logger.info(f"Loaded {len(self.mask_configs)} masks from {self.mask_file}")
            except Exception as e:
                logger.error(f"Failed to load masks: {e}")

    def save_masks(self):
        """Save mask configurations to JSON file."""
        try:
            with open(self.mask_file, 'w') as f:
                json.dump(self.mask_configs, f, indent=2)
            logger.info(f"Saved masks to {self.mask_file}")
        except Exception as e:
            logger.error(f"Failed to save masks: {e}")

    def update_mask(self, cam_id, points, frame_shape):
        """
        Create and store a binary mask from polygon points.
        
        Args:
            cam_id (str): Camera Identifier.
            points (list): List of [x, y] coordinates.
            frame_shape (tuple): (height, width) of the frame.
        """
        h, w = frame_shape[:2]
        mask = np.zeros((h, w), dtype=np.uint8)
        
        if points and len(points) > 2:
            pts = np.array(points, dtype=np.int32)
            cv2.fillPoly(mask, [pts], 255)
            self.masks[cam_id] = mask
            
            # Update config and save
            self.mask_configs[cam_id] = points
            self.save_masks()
            
            logger.info(f"Updated and saved mask for {cam_id}")
        else:
            logger.warning(f"Invalid points for mask {cam_id}: {points}")

    def process(self, frame_data):
        """
        Process a single frame from the stream.
        
        Args:
            frame_data (dict): { "frame": np.array, "cam_id": str, "batch_id": int }
            
        Returns:
            tuple: (annotated_frame, current_batch_count)
        """
        frame = frame_data['frame']
        cam_id = frame_data['cam_id']
        batch_id = frame_data['batch_id']
        
        # 1. Reset State on New Batch
        if batch_id != self.current_batch_id:
            self.current_batch_id = batch_id
            self.batch_centroids = []
            self.batch_count = 0
            # logger.info(f"New Batch: {batch_id} for {cam_id}")

        # 2. Check if we have a config loaded but not yet applied (on startup)
        if cam_id not in self.masks and cam_id in self.mask_configs:
            self.update_mask(cam_id, self.mask_configs[cam_id], frame.shape)

        # 3. Apply Mask
        if cam_id not in self.masks:
            # OPTION B: No mask -> Full frame detection
            masked_frame = frame
            mask_status = "NO MASK"
        else:
            mask = self.masks[cam_id]
            # Ensure mask matches frame size (if resolution changed)
            if mask.shape != frame.shape[:2]:
                logger.warning(f"Mask shape mismatch for {cam_id}. Resizing mask.")
                mask = cv2.resize(mask, (frame.shape[1], frame.shape[0]))
                self.masks[cam_id] = mask
            
            masked_frame = cv2.bitwise_and(frame, frame, mask=mask)
            mask_status = "MASKED"

        # 4. Inference
        # Conf=0.4 to reduce noise, Classes=[2,3,5,7] (Car, Truck, Bus, Motorcycle)
        results = self.model.predict(masked_frame, conf=0.4, classes=[2, 3, 5, 7], verbose=False)
        
        detections = []
        if results[0].boxes:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            for box in boxes:
                x1, y1, x2, y2 = map(int, box)
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                detections.append((cx, cy, x1, y1, x2, y2))

        # 5. Centroid Clustering (Verification)
        for (cx, cy, x1, y1, x2, y2) in detections:
            # Check if this centroid is close to any existing in this batch
            is_new = True
            for existing_cx, existing_cy in self.batch_centroids:
                dist = np.sqrt((cx - existing_cx)**2 + (cy - existing_cy)**2)
                if dist < 30: # 30px threshold
                    is_new = False
                    break
            
            if is_new:
                self.batch_centroids.append((cx, cy))
                self.batch_count += 1
                color = (0, 255, 0) # Green for new
            else:
                color = (0, 255, 255) # Yellow for already counted

            # Draw Box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.circle(frame, (cx, cy), 5, color, -1)

        # 6. Overlay Info
        cv2.putText(frame, f"CAM: {cam_id}", (30, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(frame, f"BATCH: {batch_id}", (30, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(frame, f"COUNT: {self.batch_count}", (30, 110), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(frame, f"STATUS: {mask_status}", (30, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        # Update Global State
        from datetime import datetime
        self.latest_counts[cam_id] = {
            "count": self.batch_count,
            "timestamp": datetime.now().isoformat()
        }

        return frame, self.batch_count
