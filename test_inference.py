import sys
import os
import traceback
import numpy as np

# Add Backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'Backend'))

try:
    from Backend.rl_inference import TrafficController
    print("Initializing TrafficController...")
    tc = TrafficController()
    
    if not tc.models_loaded:
        print("Models failed to load.")
        sys.exit(1)

    print("Running dummy inference...")
    dummy_counts = {'North': 5, 'South': 5, 'East': 2, 'West': 2}
    action = tc.get_action(dummy_counts)
    
    print(f"Action: {action}")
    print(f"Metrics: {tc.latest_metrics}")
    
    if tc.latest_metrics:
        print("SUCCESS: Inference produced metrics.")
    else:
        print("FAILURE: Inference produced no metrics (likely exception caught).")

except Exception:
    traceback.print_exc()
