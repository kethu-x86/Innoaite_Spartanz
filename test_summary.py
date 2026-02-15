import urllib.request
import json
import time

BASE_URL = "http://localhost:8000"

def test_summary():
    url = f"{BASE_URL}/summary"
    print(f"Testing GET {url}...")
    try:
        req = urllib.request.Request(url, method="GET")
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
    test_summary()
