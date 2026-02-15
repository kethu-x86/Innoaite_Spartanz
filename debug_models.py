import sys
import os
import traceback

# Add Backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'Backend'))

try:
    from Backend.rl_inference import TrafficController
    print("Attempting to initialize TrafficController...")
    tc = TrafficController()
    if tc.models_loaded:
        print("SUCCESS: Models loaded.")
    else:
        print("FAILURE: Models did not load.")
except Exception:
    traceback.print_exc()
