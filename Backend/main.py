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
import rl_inference
from llm_service import TrafficNarrator
from webrtc_utils import VideoTransformTrack
from aiortc import RTCPeerConnection, RTCSessionDescription
from typing import List, Optional
import json
import asyncio





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

# Initialize RL Controller
traffic_controller = rl_inference.TrafficController()
sumo_manager = rl_inference.SumoManager(traffic_controller)
traffic_narrator = TrafficNarrator(base_url="http://100.107.46.86:1234/v1")

# WebRTC State
pcs = set()




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
            annotated_frame, _ = processor.process(frame_data)
            
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

# --- RL / Simulation Endpoints ---

@app.get("/health")
def health_check():
    """Check health of backend and models."""
    return {
        "status": "online",
        "models_loaded": traffic_controller.models_loaded,
        "sumo_running": sumo_manager.sim_running
    }

@app.get("/control/yolo")
def get_yolo_action():
    """Get traffic light action based on live YOLO counts."""
    # Use processor.latest_counts which is a dict like {'North': 5, ...}
    # processor.latest_counts is updated by processing_loop
    counts = processor.latest_counts
    if not counts:
        raise HTTPException(status_code=503, detail="No vehicle counts available")
    
    # We might need to map keys if they differ from what the model expects
    # currently processor uses 'North', 'South' etc. based on config
    action = traffic_controller.get_action(counts)
    return {"action": action, "source": "yolo", "counts": counts}

@app.get("/control/sumo/start")
def start_sumo():
    """Start the SUMO simulation."""
    success, msg = sumo_manager.start()
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "started", "message": msg}

@app.get("/control/sumo/step")
def step_sumo():
    """Step the SUMO simulation and get the next action."""
    # This endpoint steps the sim AND returns the decision for the NEXT step
    # or the result of the current step
    metrics, err = sumo_manager.step()
    if err:
        raise HTTPException(status_code=500, detail=err)
    return metrics

@app.get("/control/sumo/stop")
def stop_sumo():
    """Stop the SUMO simulation."""
    success, msg = sumo_manager.stop()
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "stopped", "message": msg}

@app.get("/summary")
def get_traffic_summary():
    """Generate a traffic summary using LLM."""
    # Gather Context
    context = {
        "yolo": processor.latest_counts,
        "rl": traffic_controller.latest_metrics,
        "sumo": {}
    }
    
    # If SUMO is running, get its stats (queue length, etc.)
    # We can peek at sumo_manager state if we implemented getters or just rely on global state if exposed
    # For now, let's step or just get state? 
    # The SumoManager doesn't expose a 'get_state' without stepping.
    # Let's rely on what we have or modify SumoManager. 
    # Actually, we can just use the latest metrics from traffic_controller if they originate from SUMO? 
    # No, SumoManager calculates queue_len in step().
    # Let's proceed with what we have. TrafficNarrator handles missing data gracefully.
    
    summary = traffic_narrator.generate_summary(context)
    return {
        "summary": summary,
        "context": context
    }

# --- WebRTC Endpoints ---

class WebRTCOffer(BaseModel):
    sdp: str
    type: str
    cam_id: Optional[str] = None



@app.post("/offer")
async def webrtc_offer(params: WebRTCOffer):
    offer = RTCSessionDescription(sdp=params.sdp, type=params.type)
    pc = RTCPeerConnection()
    pcs.add(pc)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        logger.info(f"Connection state is {pc.connectionState}")
        if pc.connectionState == "failed" or pc.connectionState == "closed":
            await pc.close()
            pcs.discard(pc)

    # Add the video track
    def get_frame():
        with lock:
            if params.cam_id and params.cam_id in latest_frames:
                return latest_frames[params.cam_id].copy()
            if output_frame is not None:
                return output_frame.copy()
            return None

    pc.addTrack(VideoTransformTrack(get_frame))


    # Handle offer
    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return JSONResponse(content={
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type
    })

@app.on_event("shutdown")
async def on_shutdown():
    # Close all peer connections
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()




if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
