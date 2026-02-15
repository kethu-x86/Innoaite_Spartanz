import cv2
import numpy as np
from datetime import datetime
from ultralytics import YOLO

area_name = input("Enter camera area: ")
model = YOLO("yolov8n.pt")
cap = cv2.VideoCapture(2) # OBS Virtual Camera

YOLO_RES = 640 
BANNER_HEIGHT = 60
LINE_Y = 400  # The height where vehicles are counted
vehicle_ids = set() # To store unique IDs that have crossed
count = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret: break

    # Resize for YOLO consistency
    h, w = frame.shape[:2]
    new_h = int(h * (YOLO_RES / w))
    frame = cv2.resize(frame, (YOLO_RES, new_h))
    
    # 0. Define Line Position Dynamically
    LINE_Y = int(new_h * 0.6)
    
    if 'departing_mask' not in locals():
        departing_mask = np.zeros_like(frame, dtype=np.uint8)
        track_history = {}

    # 1. Use .track instead of calling model directly
    # persist=True keeps IDs consistent between frames
    results = model.track(frame, persist=True, verbose=False, tracker="bytetrack.yaml")
    
    annotated_frame = frame.copy()
    
    if results[0].boxes.id is not None:
        boxes = results[0].boxes.xyxy.cpu().numpy()
        ids = results[0].boxes.id.cpu().numpy().astype(int)
        clss = results[0].boxes.cls.cpu().numpy().astype(int)
        
        # Reset per-frame counters
        current_approaching_count = 0
        total_speed = 0
        current_vehicles_in_zone = set() # Track IDs currently in the zone (Queue / above line)
        total_visible_count = 0 # Track all relevant vehicles on screen
        total_approaching_count = 0 # Track specifically APPROACHING vehicles

        for box, id, cls in zip(boxes, ids, clss):
            # Only count 'car', 'truck', 'bus', 'motorcycle' (COCO classes 2, 3, 5, 7)
            if cls in [2, 3, 5, 7]:
                total_visible_count += 1
                
                # Update track history
                cx, cy = int((box[0] + box[2]) / 2), int((box[1] + box[3]) / 2)
                
                if id not in track_history:
                    track_history[id] = []
                track_history[id].append((cx, cy))
                if len(track_history[id]) > 30: # Keep last 30 frames
                    track_history[id].pop(0)

                # Determine direction
                dy = 0
                prev_cy = cy
                if len(track_history[id]) > 2:
                    # Calculate vector over last few frames for stability
                    prev_cy = track_history[id][-2][1]
                    dy = cy - prev_cy

                # Heuristic: Moving UP (dy < -2) = Departing
                # Heuristic: Moving DOWN (dy > 2) = Approaching
                
                x1, y1, x2, y2 = box.astype(int)
                label = f"ID:{id} dy:{dy}"

                if dy < -5: # Departing / Moving Up
                    # Add to dynamic mask
                    cv2.circle(departing_mask, (cx, cy), 20, (0, 0, 50), -1) 
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    cv2.putText(annotated_frame, f"Departing {dy}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,255), 1)
                else:
                    # Valid Approaching or Slow/Unsure
                    # This IS an approaching vehicle (or stationary)
                    total_approaching_count += 1

                    # Count for density if it's generally moving down or stationary-ish in lane
                    if dy > -2: 
                        current_approaching_count += 1
                        total_speed += dy

                    if dy > 2:
                        color = (0, 255, 0) # Green for clear Approaching
                    else:
                        color = (255, 255, 0) # Yellow for Slow/Unsure

                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(annotated_frame, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

                    # LIVE OCCUPANCY COUNTING (QUEUE)
                    # If approaching line (above line) and not departing, add to current set
                    # Once they cross (cy >= LINE_Y), they are removed from this set (count decreases)
                    if cy < LINE_Y:
                        current_vehicles_in_zone.add(id)
    
    # Update global count to reflect current occupancy (Waiting Queue)
    count = len(current_vehicles_in_zone)
    
    # Draw huge Queue Count on Frame
    cv2.putText(annotated_frame, f"WAITING: {count}", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 255), 3)
    cv2.putText(annotated_frame, f"TOTAL APPROACHING: {total_approaching_count}", (30, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)

    # --- Congestion Logic ---
    if 'current_approaching_count' not in locals():
        current_approaching_count = 0
        total_speed = 0
        
    avg_speed = 0
    if current_approaching_count > 0:
        avg_speed = total_speed / current_approaching_count

    # Heuristics
    status = "Free Flow"
    status_color = (0, 255, 0) # Green

    if count > 5: # Use 'count' (Occupancy) for congestion logic too?
        if avg_speed < 3: # Many cars, moving slow
            status = "Heavy Traffic"
            status_color = (0, 0, 255) # Red
        else:
            status = "Moderate Traffic"
            status_color = (0, 165, 255) # Orange
    elif count > 2:
        status = "Moderate Traffic"
        status_color = (0, 165, 255) # Orange

    # Blend the learned mask
    annotated_frame = cv2.addWeighted(annotated_frame, 1.0, departing_mask, 0.6, 0)

    # 2. Draw the counting line on the frame
    cv2.line(annotated_frame, (0, LINE_Y), (YOLO_RES, LINE_Y), (255, 0, 255), 3)

    # 3. Banner & Timestamp
    current_time = datetime.now().strftime("%H:%M:%S")
    # Display Status on Banner
    display_text = f"{area_name} | {current_time} | Q: {count} | {status}"
    
    banner = np.zeros((BANNER_HEIGHT, YOLO_RES, 3), dtype=np.uint8)
    # Background color for status? Or just text. Let's do text color.
    cv2.putText(banner, display_text, (15, 38), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    # Draw a colored circle for status
    cv2.circle(banner, (YOLO_RES - 30, 30), 10, status_color, -1)

    # 4. Final Output
    final_output = cv2.vconcat([annotated_frame, banner])
    cv2.imshow("Traffic Monitor", final_output)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()