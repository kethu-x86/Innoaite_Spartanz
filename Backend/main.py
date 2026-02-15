from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import cv2
import threading
import time
import uvicorn
import logging
from typing import List

from stream_gen import StreamGenerator
from processor import FrameProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
processor = FrameProcessor(model_path="./Backend/models/yolo26l.engine")
# Simulate 2 cameras with index 0 (webcam) or fallback to test file if needed
# If user has no webcam, this might fail. Ideally we'd use a file.
# Let's try to find a valid source.
try:
    generator = StreamGenerator(sources=[1, 1, 1, 1], batch_size=4, target_size=(640, 640))
except Exception as e:
    logger.error(f"Failed to initialize StreamGenerator: {e}")
    generator = None

output_frame = None
latest_frames = {} # Store latest frame for each camera for devstream
lock = threading.Lock()

class MaskConfig(BaseModel):
    cam_id: str
    points: List[List[int]]

def processing_loop():
    """Background loop to process frames."""
    global output_frame, generator, latest_frames
    
    if not generator:
        logger.error("Generator not initialized, skipping loop.")
        return

    logger.info("Starting processing loop...")
    try:
        for frame_data in generator.generate():
            # Store raw frame for devstream
            cam_id = frame_data['cam_id']
            with lock:
                latest_frames[cam_id] = frame_data['frame'].copy()

            # Process frame
            annotated_frame, count = processor.process(frame_data)
            
            # Update global frame for streaming
            with lock:
                output_frame = annotated_frame.copy()
            
            # Small sleep to prevent CPU hogging if processing is too fast
            # time.sleep(0.01) 
    except Exception as e:
        logger.error(f"Error in processing loop: {e}")

@app.on_event("startup")
async def startup_event():
    # Start processing in a separate thread
    t = threading.Thread(target=processing_loop, daemon=True)
    t.start()

@app.get("/")
def read_root():
    return {"message": "Multiplexed Traffic Monitor API"}

@app.get("/stream")
def video_feed():
    """Video streaming route. Put this in the src attribute of an img tag."""
    return StreamingResponse(generate_mjpeg(), 
                             media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/devstream/{cam_id}")
def dev_video_feed(cam_id: str):
    """Raw video stream for a specific camera ID."""
    return StreamingResponse(generate_cam_mjpeg(cam_id), 
                             media_type="multipart/x-mixed-replace; boundary=frame")

def generate_mjpeg():
    """Generator for MJPEG stream."""
    global output_frame
    while True:
        with lock:
            if output_frame is None:
                time.sleep(0.1)
                continue
            (flag, encodedImage) = cv2.imencode(".jpg", output_frame)
            if not flag:
                continue
        
        yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + 
               bytearray(encodedImage) + b'\r\n')
        time.sleep(0.03) # Limit stream FPS

def generate_cam_mjpeg(cam_id: str):
    """Generator for specific camera MJPEG stream."""
    global latest_frames
    while True:
        with lock:
            frame = latest_frames.get(cam_id)
            if frame is None:
                time.sleep(0.1)
                continue
            (flag, encodedImage) = cv2.imencode(".jpg", frame)
            if not flag:
                continue
        
        yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + 
               bytearray(encodedImage) + b'\r\n')
        time.sleep(0.03) # Limit stream FPS

@app.get("/data")
def get_data():
    """Return latest counts."""
    return JSONResponse(content=processor.latest_counts)

@app.post("/config/mask")
def set_mask(config: MaskConfig):
    """Update mask for a camera."""
    if output_frame is None:
        raise HTTPException(status_code=503, detail="Stream not ready")
        
    with lock:
        h, w = output_frame.shape[:2]
        
    processor.update_mask(config.cam_id, config.points, (h, w))
    return {"status": "success", "cam_id": config.cam_id, "points": len(config.points)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
