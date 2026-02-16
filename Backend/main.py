from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import cv2
import threading
import time
import uvicorn
import logging
from typing import List, Optional
import asyncio

from stream_gen import StreamGenerator
from processor import FrameProcessor
import rl_inference
from llm_service import TrafficNarrator
from webrtc_utils import VideoTransformTrack
from alert_service import AlertEngine, EmergencyManager
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, RTCIceServer


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress benign aioice errors (WinError 10049 on APIPA addresses)
logging.getLogger("aioice.ice").setLevel(logging.WARNING)

# --- Lifespan (replaces deprecated on_event) ---

@asynccontextmanager
async def lifespan(app):
    # Startup: launch processing thread
    t = threading.Thread(target=processing_loop, daemon=True)
    t.start()
    logger.info("Processing thread started via lifespan.")
    yield
    # Shutdown: close all WebRTC peer connections
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()
    logger.info("All peer connections closed.")

app = FastAPI(lifespan=lifespan)

# Enable CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
processor = FrameProcessor(model_path="./Backend/models/yolo26l.engine")
# Simulate 2 cameras with index 0 (webcam) or fallback to test file if needed
try:
    generator = StreamGenerator(
        sources=[1, 1, 1, 1], 
        labels=['North', 'East', 'West', 'South'],
        batch_size=4, 
        target_size=(640, 640)
    )
except Exception as e:
    logger.error(f"Failed to initialize StreamGenerator: {e}")
    generator = None

output_frame = None
latest_frames = {} # Store latest frame for each camera for devstream
lock = threading.Lock()

# Initialize RL Controller
traffic_controller = rl_inference.TrafficController()
sumo_manager = rl_inference.SumoManager(traffic_controller)
traffic_narrator = TrafficNarrator(base_url="http://127.0.0.1:1234/v1")

# Alert & Emergency Systems
alert_engine = AlertEngine(junction_name="Kochi Junction")
emergency_manager = EmergencyManager(timeout=120)

# WebRTC State
pcs = set()


class MaskConfig(BaseModel):
    cam_id: str
    points: List[List[int]]

class EmergencyRequest(BaseModel):
    direction: str
    active: bool

def processing_loop():
    """Background loop to process frames."""
    global output_frame, generator, latest_frames
    
    if not generator:
        logger.error("Generator not initialized, skipping loop.")
        return

    logger.info("Starting processing loop...")
    try:
        for frame_data in generator.generate():
            cam_id = frame_data['cam_id']
            frame = frame_data['frame']

            # Process frame (annotates in-place on a copy)
            annotated_frame, _ = processor.process(frame_data)
            
            # Single lock acquisition for both updates
            with lock:
                latest_frames[cam_id] = frame
                output_frame = annotated_frame
            
    except Exception as e:
        logger.error(f"Error in processing loop: {e}")

@app.get("/")
def read_root():
    return {"message": "Smart Traffic API"}

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
    emergency_state = emergency_manager.get_state()
    return {
        "status": "online",
        "models_loaded": traffic_controller.models_loaded,
        "sumo_running": sumo_manager.sim_running,
        "emergency_active": emergency_state["active"],
        "emergency_direction": emergency_state["direction"]
    }

# YOLO action cache — skip inference when counts haven't changed
_last_yolo_counts = None
_last_yolo_response = None

@app.get("/control/yolo")
def get_yolo_action():
    """Get traffic light action based on live YOLO counts (cached when unchanged)."""
    global _last_yolo_counts, _last_yolo_response

    counts = processor.latest_counts
    if not counts:
        raise HTTPException(status_code=503, detail="No vehicle counts available")
    
    emergency_dir = emergency_manager.get_priority_direction()

    # Skip full RL inference if counts + emergency state are identical
    if (counts == _last_yolo_counts
            and _last_yolo_response is not None
            and _last_yolo_response.get("emergency_direction") == emergency_dir):
        return _last_yolo_response

    action = traffic_controller.get_action(counts, emergency_direction=emergency_dir)
    _last_yolo_response = {
        "action": action, 
        "source": "yolo",
        "counts": counts,
        "emergency_active": emergency_dir is not None,
        "emergency_direction": emergency_dir
    }
    _last_yolo_counts = counts.copy() if isinstance(counts, dict) else counts
    return _last_yolo_response

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
    # Check emergency override
    emergency_dir = emergency_manager.get_priority_direction()
    
    # If emergency, pass it through to the controller
    # The SumoManager.step() calls controller.get_action() internally,
    # so we need to pass the emergency direction via the controller or directly
    metrics, err = sumo_manager.step(emergency_direction=emergency_dir)
    if err:
        raise HTTPException(status_code=500, detail=err)
    
    # Generate alerts from SUMO metrics
    if metrics:
        alert_engine.evaluate(metrics)
        
        # Auto-detect emergency vehicles from SUMO
        ev = metrics.get("emergency_vehicles", [])
        if ev and not emergency_manager.get_state()["active"]:
            # Auto-activate emergency for the first detected vehicle's direction
            emergency_manager.activate(ev[0]["direction"])
            logger.warning(f"🚨 Auto-detected emergency vehicle: {ev[0]}")
    
    return metrics

@app.get("/control/sumo/stop")
def stop_sumo():
    """Stop the SUMO simulation."""
    success, msg = sumo_manager.stop()
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "stopped", "message": msg}

# --- Emergency Endpoints ---

@app.post("/control/emergency")
def set_emergency(req: EmergencyRequest):
    """Activate or deactivate emergency priority override."""
    if req.active:
        if req.direction not in ['North', 'South', 'East', 'West']:
            raise HTTPException(status_code=400, detail="Direction must be North, South, East, or West")
        emergency_manager.activate(req.direction)
        return {"status": "activated", "direction": req.direction}
    else:
        emergency_manager.deactivate()
        return {"status": "deactivated"}

@app.get("/control/emergency")
def get_emergency():
    """Get current emergency state."""
    return emergency_manager.get_state()

# --- Alert Endpoints ---

@app.get("/alerts")
def get_alerts():
    """Get current alert and recent alert history."""
    return {
        "current": alert_engine.get_current(),
        "history": alert_engine.get_history(50)
    }

# --- Violation Endpoints ---

@app.get("/violations")
def get_violations():
    """Get recent violations (illegal parking, lane violations)."""
    return {
        "violations": processor.violation_tracker.get_violations(100),
        "active_stationary": processor.violation_tracker.get_active_stationary()
    }

# --- Summary Endpoint (60s cache to avoid hammering LLM) ---

_summary_cache = None
_summary_cache_time = 0
SUMMARY_CACHE_TTL = 60  # seconds

@app.get("/summary")
def get_traffic_summary():
    """Generate a traffic summary using LLM. Cached for 60 seconds."""
    global _summary_cache, _summary_cache_time

    now = time.time()
    if _summary_cache and (now - _summary_cache_time < SUMMARY_CACHE_TTL):
        return _summary_cache

    # Gather Context
    emergency_state = emergency_manager.get_state()
    current_alert = alert_engine.get_current()
    violations = processor.violation_tracker.get_violations(10)
    
    context = {
        "yolo": processor.latest_counts,
        "rl": traffic_controller.latest_metrics,
        "sumo": {},
        "alerts": current_alert,
        "violations": violations,
        "emergency": emergency_state
    }
    
    summary = traffic_narrator.generate_summary(context, junction_name="Kochi Junction")
    _summary_cache = {
        "summary": summary,
        "context": context
    }
    _summary_cache_time = now
    return _summary_cache

# --- WebRTC Endpoints ---

class WebRTCOffer(BaseModel):
    sdp: str
    type: str
    cam_id: Optional[str] = None



@app.post("/offer")
async def webrtc_offer(params: WebRTCOffer):
    logger.info(f"Received WebRTC offer for cam_id: {params.cam_id}")
    offer = RTCSessionDescription(sdp=params.sdp, type=params.type)
    
    # Use Google STUN server for better connectivity
    config = RTCConfiguration(iceServers=[RTCIceServer(urls=["stun:stun.l.google.com:19302"])])
    pc = RTCPeerConnection(configuration=config)
    pcs.add(pc)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        logger.info(f"Connection state for {params.cam_id} is {pc.connectionState}")
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

# Shutdown is handled by lifespan context manager above




if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
