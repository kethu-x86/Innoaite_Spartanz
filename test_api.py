import urllib.request
import json
import time

BASE_URL = "http://localhost:8000"

def test_endpoint(endpoint, method="GET"):
    url = f"{BASE_URL}{endpoint}"
    print(f"Testing {method} {url}...")
    try:
        req = urllib.request.Request(url, method=method)
        with urllib.request.urlopen(req) as response:
            data = json.load(response)
            print(f"SUCCESS: {data}")
            return data
    except urllib.error.HTTPError as e:
        print(f"FAILURE: HTTP {e.code} - {e.reason}")
        print(e.read().decode())
        return None
    except Exception as e:
        print(f"ERROR: {e}")
        return None

if __name__ == "__main__":
    # 1. Health
    print("\n--- 1. Health Check ---")
    health = test_endpoint("/health")

    # 2. YOLO Control
    print("\n--- 2. YOLO Control ---")
    # This might fail if frame processor hasn't started or processed frames yet
    yolo = test_endpoint("/control/yolo")

    # 3. SUMO Control
    print("\n--- 3. SUMO Start ---")
    start = test_endpoint("/control/sumo/start")

    # If start works or complains it's already running, we can proceed
    if start or (start is None): 
        # Note: test_endpoint returns None on HTTP error, but we might want to try stepping anyway 
        # if the error was "already running". 
        # But for this simple script, let's just try stepping.
        
        print("\n--- 4. SUMO Step (x3) ---")
        for i in range(3):
            step = test_endpoint("/control/sumo/step")
            time.sleep(0.5)

        print("\n--- 5. SUMO Stop ---")
        stop = test_endpoint("/control/sumo/stop")
