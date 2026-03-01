import os
import asyncio

# Windows-specific fix for aiortc and asyncio networking
if os.name == "nt":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass  # Fallback to default if already set or not available

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi import Query
from pydantic import BaseModel, Field
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
from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
    RTCConfiguration,
    RTCIceServer,
)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress benign aioice errors (WinError 10049 on APIPA addresses)
logging.getLogger("aioice.ice").setLevel(logging.WARNING)

# --- Lifespan (replaces deprecated on_event) ---


@asynccontextmanager
async def lifespan(app):
    # Initialize SQLite Database
    import database

    database.init_db()
    logger.info("Database initialized.")

    # Startup: process thread if ML is enabled
    if not DISABLE_ML:
        t = threading.Thread(target=processing_loop, daemon=True)
        t.start()
        logger.info("Processing thread started via lifespan.")
    else:
        logger.info("Processing loop disabled in NO-ML mode.")
    yield
    # Shutdown: close all WebRTC peer connections
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()
    logger.info("All peer connections closed.")


tags_metadata = [
    {"name": "General", "description": "Basic server health and data endpoints."},
    {
        "name": "Configuration",
        "description": "Configure the running cameras and masks.",
    },
    {
        "name": "Simulation & Control",
        "description": "Endpoints to interact with the SUMO simulation and RL system.",
    },
    {
        "name": "Emergency",
        "description": "Manage emergency priority overrides for intersections.",
    },
    {
        "name": "Reporting",
        "description": "Browse logs and historical data from the SQLite database.",
    },
    {"name": "WebRTC", "description": "WebRTC offer endpoints for video streaming."},
]

app = FastAPI(
    title="Smart Traffic Control API",
    description="API for the Innoate Smart Traffic Control System. Provides real-time traffic tracking, Reinforcement Learning based traffic signal control, and SUMO simulation management.",
    version="1.0.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

# Enable CORS
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
import sys  # noqa: E402

DISABLE_ML = os.environ.get("DISABLE_ML", "0") == "1" or "--no-ml" in sys.argv

if not DISABLE_ML:
    processor = FrameProcessor(model_path="./models/yolo26l.engine")
    # Simulate 2 cameras with index 0 (webcam) or fallback to test file if needed
    try:
        generator = StreamGenerator(
            sources=[1, 1, 1, 1],
            labels=["North", "East", "West", "South"],
            batch_size=4,
            target_size=(640, 640),
        )
    except Exception as e:
        logger.error(f"Failed to initialize StreamGenerator: {e}")
        generator = None

    # Initialize RL Controller
    traffic_controller = rl_inference.TrafficController()
    sumo_manager = rl_inference.SumoManager(traffic_controller)
    traffic_narrator = TrafficNarrator(base_url="http://127.0.0.1:1234/v1")
else:
    logger.warning("Running in NO-ML Mode. ML models will NOT be loaded.")

    class MockViolationTracker:
        def get_violations(self, *args):
            return []

        def get_active_stationary(self):
            return []

    class MockProcessor:
        latest_counts = {}
        violation_tracker = MockViolationTracker()

        def update_mask(self, *args):
            pass

    processor = MockProcessor()
    generator = None

    class MockController:
        models_loaded = False
        latest_metrics = {"action": 0, "predicted_congestion_index": 0.0}

        def get_action(self, *args, **kwargs):
            return 0

    traffic_controller = MockController()

    class MockSumoManager:
        sim_running = False

        def start(self):
            return (False, "Disabled in NO-ML mode")

        def stop(self):
            return (False, "Disabled")

        def step(self, *args, **kwargs):
            return ({}, "Disabled")

    sumo_manager = MockSumoManager()

    class MockNarrator:
        def generate_summary(self, *args, **kwargs):
            return "LLM Summary disabled in NO-ML mode."

    traffic_narrator = MockNarrator()

output_frame = None
latest_frames = {}  # Store latest frame for each camera for devstream
lock = threading.Lock()

# Alert & Emergency Systems
alert_engine = AlertEngine(junction_name="NeuroTraffic")
emergency_manager = EmergencyManager(timeout=120)

# WebRTC State
pcs = set()


class MaskConfig(BaseModel):
    cam_id: str = Field(..., description="Camera ID to apply mask to, e.g., 'North'")
    points: List[List[int]] = Field(
        ..., description="List of [x, y] coordinates forming a polygon mask"
    )


class EmergencyRequest(BaseModel):
    direction: str = Field(
        ...,
        description="Direction for emergency priority (e.g., 'North', 'South', 'East', 'West')",
    )
    active: bool = Field(
        ..., description="True to activate override, False to deactivate"
    )


def processing_loop():
    """Background loop to process frames."""
    global output_frame, generator, latest_frames

    if not generator:
        logger.error("Generator not initialized, skipping loop.")
        return

    logger.info("Starting processing loop...")
    try:
        for frame_data in generator.generate():
            cam_id = frame_data["cam_id"]
            frame = frame_data["frame"]

            # Process frame (annotates in-place on a copy)
            annotated_frame, _ = processor.process(frame_data)

            # Single lock acquisition for both updates
            with lock:
                latest_frames[cam_id] = frame
                output_frame = annotated_frame

    except Exception as e:
        logger.error(f"Error in processing loop: {e}")


@app.get("/", tags=["General"], summary="Root Endpoint")
def read_root():
    """Returns a simple greeting message from the API."""
    return {"message": "Smart Traffic API"}


@app.get("/data", tags=["General"], summary="Get Latest Traffic Counts")
def get_data():
    """
    Returns the latest raw vehicle counts for each direction (North, East, West, South)
    as detected by the YOLO models.
    """
    return JSONResponse(content=processor.latest_counts)


@app.post("/config/mask", tags=["Configuration"], summary="Set Camera Mask")
def set_mask(config: MaskConfig):
    """
    Update the detection mask for a specific camera view.
    Points should be a list of lists of standard coordinates [x, y].
    """
    if output_frame is None:
        raise HTTPException(status_code=503, detail="Stream not ready")

    with lock:
        h, w = output_frame.shape[:2]

    processor.update_mask(config.cam_id, config.points, (h, w))
    return {"status": "success", "cam_id": config.cam_id, "points": len(config.points)}


# --- RL / Simulation Endpoints ---


@app.get("/health", tags=["General"], summary="System Health Check")
def health_check():
    """
    Check the operational health of the backend, verifying that the
    RL models are loaded, the SUMO simulation is running, and the current
    emergency priority state.
    """
    emergency_state = emergency_manager.get_state()
    return {
        "status": "online",
        "models_loaded": traffic_controller.models_loaded,
        "sumo_running": sumo_manager.sim_running,
        "emergency_active": emergency_state["active"],
        "emergency_direction": emergency_state["direction"],
    }


# YOLO action cache — skip inference when counts haven't changed
_last_yolo_counts = None
_last_yolo_response = None


@app.get("/control/yolo", tags=["Simulation & Control"], summary="Get YOLO Actions")
def get_yolo_action():
    """
    Retrieves the optimal traffic light action based on the live vehicle
    counts from the YOLO tracking endpoints. Requests are cached if counts are unchanged.
    Automatically factors in emergency direction override if active.
    """
    global _last_yolo_counts, _last_yolo_response

    counts = processor.latest_counts
    if not counts:
        raise HTTPException(status_code=503, detail="No vehicle counts available")

    emergency_dir = emergency_manager.get_priority_direction()

    # Skip full RL inference if counts + emergency state are identical
    if (
        counts == _last_yolo_counts
        and _last_yolo_response is not None
        and _last_yolo_response.get("emergency_direction") == emergency_dir
    ):
        return _last_yolo_response

    action = traffic_controller.get_action(counts, emergency_direction=emergency_dir)
    _last_yolo_response = {
        "action": action,
        "source": "yolo",
        "counts": counts,
        "emergency_active": emergency_dir is not None,
        "emergency_direction": emergency_dir,
    }
    _last_yolo_counts = counts.copy() if isinstance(counts, dict) else counts

    # Log to SQLite Database
    try:
        import database

        cycle_duration = (
            action.get("cycle", action.get("cycle_duration", 60))
            if isinstance(action, dict)
            else 60
        )
        splits = action.get("splits", {}) if isinstance(action, dict) else {}
        is_emergency = emergency_dir is not None

        database.log_traffic_and_schedule(
            intersection_id="INT_01",
            counts=counts,
            cycle_duration=cycle_duration,
            split_ratios=splits,
            is_emergency=is_emergency,
        )
    except Exception as e:
        logger.error(f"Failed to log to sqlite DB: {e}")

    return _last_yolo_response


@app.get(
    "/control/sumo/start",
    tags=["Simulation & Control"],
    summary="Start SUMO Simulation",
)
def start_sumo():
    """
    Spawns and initializes a SUMO simulation using the preconfigured SUMO network.
    Returns HTTP 400 if it's already running.
    """
    success, msg = sumo_manager.start()
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "started", "message": msg}


@app.get(
    "/control/sumo/step",
    tags=["Simulation & Control"],
    summary="Step Simulation with Actions",
)
def step_sumo():
    """
    Steps the active SUMO simulation by a single tick.
    Extracts sensor metrics, feeds them to the RL model, retrieves the optimal
    action, applies the action, and then evaluates collision or emergency alerts.
    """
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


@app.get(
    "/control/sumo/stop", tags=["Simulation & Control"], summary="Stop SUMO Simulation"
)
def stop_sumo():
    """Safely terminates the active SUMO simulation."""
    success, msg = sumo_manager.stop()
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "stopped", "message": msg}


# --- Emergency Endpoints ---


@app.post("/control/emergency", tags=["Emergency"], summary="Set Emergency Priority")
def set_emergency(req: EmergencyRequest):
    """
    Activates or deactivates an emergency priority override for a specific direction.
    If active, the traffic lights will prioritize green for the specified direction.
    """
    if req.active:
        if req.direction not in ["North", "South", "East", "West"]:
            raise HTTPException(
                status_code=400, detail="Direction must be North, South, East, or West"
            )
        emergency_manager.activate(req.direction)
        return {"status": "activated", "direction": req.direction}
    else:
        emergency_manager.deactivate()
        return {"status": "deactivated"}


@app.get("/control/emergency", tags=["Emergency"], summary="Get Emergency State")
def get_emergency():
    """Retrieves the current status and direction of any active emergency overrides."""
    return emergency_manager.get_state()


# --- Alert Endpoints ---


@app.get("/alerts", tags=["Reporting"], summary="Get Alerts")
def get_alerts():
    """
    Fetches the currently active traffic alerts (e.g., collisions, congestion)
    and a history of the 50 most recent alerts.
    """
    return {
        "current": alert_engine.get_current(),
        "history": alert_engine.get_history(50),
    }


# --- Violation Endpoints ---


@app.get("/violations", tags=["Reporting"], summary="Get Live Violations")
def get_violations():
    """
    Retrieves a list of recent traffic violations such as illegal parking
    and stationary vehicles directly tracked by the YOLO processor.
    """
    return {
        "violations": processor.violation_tracker.get_violations(100),
        "active_stationary": processor.violation_tracker.get_active_stationary(),
    }


# --- Summary Endpoint (60s cache to avoid hammering LLM) ---

_summary_cache = None
_summary_cache_time = 0
SUMMARY_CACHE_TTL = 60  # seconds


@app.get("/summary", tags=["Reporting"], summary="Generate AI Traffic Summary")
def get_traffic_summary():
    """
    Generates a natural language summary of the current traffic state using a
    Large Language Model (LLM). Integrates data from YOLO, RL metrics, alerts,
    and emergency states.
    Cached for 60 seconds to prevent rate limiting.
    """
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
        "emergency": emergency_state,
    }

    summary = traffic_narrator.generate_summary(context, junction_name="NeuroTraffic")
    _summary_cache = {"summary": summary, "context": context}
    _summary_cache_time = now
    return _summary_cache


# --- WebRTC Endpoints ---


class WebRTCOffer(BaseModel):
    sdp: str
    type: str
    cam_id: Optional[str] = None


@app.post("/offer", tags=["WebRTC"], summary="Initialize WebRTC Stream")
async def webrtc_offer(params: WebRTCOffer):
    """
    Accepts an SDP offer from a WebRTC client and returns an SDP answer.
    Establishes a peer-to-peer connection for streaming annotated
    YOLO traffic camera video feeds.
    """
    logger.info(f"Received WebRTC offer for cam_id: {params.cam_id}")
    offer = RTCSessionDescription(sdp=params.sdp, type=params.type)

    # Use Google STUN server for better connectivity
    config = RTCConfiguration(
        iceServers=[RTCIceServer(urls=["stun:stun.l.google.com:19302"])]
    )
    pc = RTCPeerConnection(configuration=config)
    pcs.add(pc)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        logger.info(f"Connection state for {params.cam_id} is {pc.connectionState}")
        if pc.connectionState == "failed" or pc.connectionState == "closed":
            await pc.close()
            pcs.discard(pc)

    @pc.on("iceconnectionstatechange")
    async def on_iceconnectionstatechange():
        logger.info(
            f"ICE connection state for {params.cam_id} is {pc.iceConnectionState}"
        )

    @pc.on("icegatheringstatechange")
    async def on_icegatheringstatechange():
        logger.info(
            f"ICE gathering state for {params.cam_id} is {pc.iceGatheringState}"
        )

    # Add the video track
    def get_frame():
        with lock:
            if (
                params.cam_id
                and params.cam_id in latest_frames
                and latest_frames[params.cam_id] is not None
            ):
                return latest_frames[params.cam_id].copy()
            if output_frame is not None:
                # logger.debug(f"Cam {params.cam_id} frame not ready, using global output_frame")
                return output_frame.copy()
            return None

    logger.info(f"Adding VideoTransformTrack for {params.cam_id}")
    pc.addTrack(VideoTransformTrack(get_frame))

    # Handle offer
    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    # Wait for ICE gathering to complete (non-trickle WebRTC)
    logger.info(f"Waiting for ICE gathering to complete for {params.cam_id}...")
    gather_timeout = 5.0  # 5 seconds max wait
    start_gather = time.time()
    while (
        pc.iceGatheringState != "complete"
        and (time.time() - start_gather) < gather_timeout
    ):
        await asyncio.sleep(0.1)
    logger.info(f"ICE gathering state: {pc.iceGatheringState}")

    return JSONResponse(
        content={"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
    )


# Shutdown is handled by lifespan context manager above

# --- DB Reporting Endpoints ---


@app.get(
    "/api/intersections", tags=["Reporting"], summary="Get All Documented Intersections"
)
def api_get_intersections():
    """Retrieve details for all tracked intersections from the SQLite database."""
    import database

    return database.get_intersections()


@app.get(
    "/api/logs/traffic", tags=["Reporting"], summary="Browse Historic Traffic Logs"
)
def api_get_traffic_logs(
    limit: int = Query(50, description="Max number of logs to return"),
    offset: int = Query(0, description="Offset for pagination"),
):
    """Browse historical traffic volume logs stored in the SQLite database."""
    import database

    return database.get_traffic_logs(limit, offset)


@app.get(
    "/api/logs/schedules", tags=["Reporting"], summary="Browse Evaluated RL Schedules"
)
def api_get_signal_schedules(
    limit: int = Query(50, description="Max number of schedules to return"),
    offset: int = Query(0, description="Offset for pagination"),
):
    """Browse historical traffic light signals & split schedules generated by RL."""
    import database

    return database.get_signal_schedules(limit, offset)


@app.get(
    "/api/logs/violations", tags=["Reporting"], summary="Browse Historic Violations"
)
def api_get_violations_logs(
    limit: int = Query(50, description="Max number of violations to return"),
    offset: int = Query(0, description="Offset for pagination"),
):
    """Browse historical traffic violation logs."""
    import database

    return database.get_violations(limit, offset)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
