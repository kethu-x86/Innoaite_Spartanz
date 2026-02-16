import asyncio
import logging
import numpy as np
from aiortc import MediaStreamTrack
from av import VideoFrame
import fractions
import time

logger = logging.getLogger(__name__)

MAX_RECV_RETRIES = 300  # ~3 seconds at 10ms intervals

class VideoTransformTrack(MediaStreamTrack):
    """
    A video stream track that transforms frames from an OpenCV source.
    """
    kind = "video"

    def __init__(self, get_frame_callback):
        super().__init__()
        self.get_frame_callback = get_frame_callback
        self._start_time = None
        self._timestamp = 0

    async def recv(self):
        """
        Receives the next frame. Uses iterative retry instead of recursion.
        """
        pts, time_base = await self.next_timestamp()

        # Iterative retry loop (replaces unbounded recursion)
        for _ in range(MAX_RECV_RETRIES):
            frame = self.get_frame_callback()
            if frame is not None:
                new_frame = VideoFrame.from_ndarray(frame, format="bgr24")
                new_frame.pts = pts
                new_frame.time_base = time_base
                return new_frame
            await asyncio.sleep(0.01)

        # Fallback: return a black frame to keep the stream alive
        logger.warning("No frame available after retries, sending blank frame")
        blank = np.zeros((480, 640, 3), dtype=np.uint8)
        new_frame = VideoFrame.from_ndarray(blank, format="bgr24")
        new_frame.pts = pts
        new_frame.time_base = time_base
        return new_frame

    async def next_timestamp(self):
        """
        Calculates the next timestamp.
        """
        if self._start_time is None:
            self._start_time = time.time()
            
        clock_rate = 90000
        # Target 30 FPS
        self._timestamp += int(clock_rate / 30)
        
        # Add some pacing
        wait = self._start_time + (self._timestamp / clock_rate) - time.time()
        if wait > 0:
            await asyncio.sleep(wait)
            
        return self._timestamp, fractions.Fraction(1, clock_rate)
