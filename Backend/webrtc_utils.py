import asyncio
import logging
from aiortc import MediaStreamTrack
from av import VideoFrame
import fractions
import time

logger = logging.getLogger(__name__)

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
        Receives the next frame.
        """
        pts, time_base = await self.next_timestamp()

        # Get the latest frame from the callback (which usually reads from global state)
        frame = self.get_frame_callback()
        
        if frame is None:
            # If no frame is available, we might want to wait a bit or send a blank frame
            # For now, let's just wait a tiny bit to avoid busy loop if called too fast
            await asyncio.sleep(0.01)
            # Recursively try again
            return await self.recv()

        # Convert OpenCV (BGR) to PyAV VideoFrame (RGB)
        new_frame = VideoFrame.from_ndarray(frame, format="bgr24")
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
