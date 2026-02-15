import urllib.request
import json
import time

BASE_URL = "http://localhost:8000"

def call_api(endpoint):
    url = f"{BASE_URL}{endpoint}"
    print(f"Calling {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            return json.load(response)
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    print("--- 1. Start SUMO ---")
    call_api("/control/sumo/start")
    
    print("\n--- 2. Step SUMO (to generate metrics) ---")
    # Step a few times to fill history slightly
    for _ in range(3):
        call_api("/control/sumo/step")
        time.sleep(0.5)

    print("\n--- 3. Get Summary (Should include SUMO/RL data) ---")
    summary = call_api("/summary")
    print("Summary Response:", json.dumps(summary, indent=2))
    
    # Check if context has RL data
    if summary and summary.get("context", {}).get("rl"):
        print("\nSUCCESS: RL metrics present in context.")
    else:
        print("\nWARNING: RL metrics missing from context.")

    print("\n--- 4. Stop SUMO ---")
    call_api("/control/sumo/stop")
