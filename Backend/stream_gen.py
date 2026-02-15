import cv2
import time
import logging
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StreamGenerator:
    def __init__(self, sources, batch_size=4, target_size=(640, 640)):
        """
        Simulates a multiplexed stream from multiple sources.
        
        Args:
            sources (list): List of video sources (file paths or camera indices).
            batch_size (int): Number of frames to yield per camera before switching.
            target_size (tuple): Target resolution (width, height) to resize frames to.
        """
        self.sources = sources
        self.batch_size = batch_size
        self.target_size = target_size
        self.caps = []
        self.current_source_idx = 0
        self.frame_counter = 0
        self.batch_id = 0
        
        self._init_sources()

    def _init_sources(self):
        """Initialize VideoCapture objects for all sources."""
        unique_caps = {} # Map source -> cap

        for src in self.sources:
            if src == "dummy":
                self.caps.append("dummy")
                continue
            
            # If we already opened this source, reuse it
            if src in unique_caps:
                self.caps.append(unique_caps[src])
                continue

            # Open new source
            if isinstance(src, int):
                # Force DirectShow on Windows to avoid MSMF errors
                cap = cv2.VideoCapture(src, cv2.CAP_DSHOW)
            else:
                cap = cv2.VideoCapture(src)
            
            if not cap.isOpened():
                logger.warning(f"Failed to open source: {src}")
            
            unique_caps[src] = cap
            self.caps.append(cap)
            
        # if not any(cap.isOpened() for cap in self.caps):
        #    raise RuntimeError("No valid video sources found.")

    def generate(self):
        """
        Yields frames from the multiplexed stream.
        
        Yields:
            dict: {
                "frame": np.array,
                "cam_id": str,
                "batch_id": int
            }
        """
        while True:
            # Determine current camera
            cap = self.caps[self.current_source_idx]
            cam_id = f"CAM_{self.current_source_idx:02d}"
            
            if cap == "dummy":
                # Generate dummy frame (noise)
                frame = np.random.randint(0, 255, (self.target_size[1], self.target_size[0], 3), dtype=np.uint8)
                # Add some moving element to simulate checking?
                cv2.circle(frame, (self.frame_counter * 10 % 640, 320), 20, (255, 0, 0), -1)
                time.sleep(0.1) # Simulate frame rate
                ret = True
            elif not cap.isOpened():
                self._advance_source()
                continue
            else:
                ret, frame = cap.read()
            
            if not ret:
                # If video ends, loop it
                if cap != "dummy":
                    logger.info(f"Source {self.current_source_idx} ended, restarting...")
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            # Resize to target resolution
            if self.target_size:
                frame = cv2.resize(frame, self.target_size)

            yield {
                "frame": frame,
                "cam_id": cam_id,
                "batch_id": self.batch_id
            }

            self.frame_counter += 1
            
            # Check for batch completion
            if self.frame_counter >= self.batch_size:
                self._advance_source()

    def _advance_source(self):
        """Switch to the next camera and increment batch ID."""
        self.frame_counter = 0
        self.batch_id += 1
        self.current_source_idx = (self.current_source_idx + 1) % len(self.caps)
        # logger.info(f"Switching to {self.sources[self.current_source_idx]} (Batch {self.batch_id})")

    def release(self):
        """Release all resources."""
        for cap in self.caps:
            cap.release()

if __name__ == "__main__":
    # Test with webcam or dummy file
    # You can pass [0] for webcam, or ["video.mp4"]
    # For testing without a file, we might need a dummy generator, but assuming user has a source.
    # We'll default to trying index 0 and 1 (if available) or just 0 twice to simulate switching.
    
    # Example: duplicate the same source to simulate 2 cameras
    gen = StreamGenerator(sources=[0, 0], batch_size=4) 
    
    try:
        for data in gen.generate():
            frame = data['frame']
            text = f"{data['cam_id']} | Batch: {data['batch_id']}"
            cv2.putText(frame, text, (30, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            cv2.imshow("Multiplexed Stream Test", frame)
            if cv2.waitKey(100) & 0xFF == ord('q'): # Slower waitKey to see the switch
                break
    except Exception as e:
        print(f"Error: {e}")
    finally:
        gen.release()
        cv2.destroyAllWindows()
