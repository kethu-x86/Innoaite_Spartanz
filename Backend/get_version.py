def get_trt_version(path):
    try:
        with open(path, "rb") as f:
            # TensorRT engines start with 'TRT' or 'trtl' magic header
            magic = f.read(4)
            print(f"Magic Header: {magic}")

            # Read the next 50 bytes and look for a version-like string
            data = f.read(50)
            # Filter for printable characters and dots (e.g., 10.7.0)
            version = "".join([chr(b) for b in data if (48 <= b <= 57) or b == 46])

            # Usually the version is the first thing after the magic
            # Look for patterns like '861', '1070', or '10.7.0'
            print(f"Potential Version String: {version[:10]}")
    except Exception as e:
        print(f"Error: {e}")


get_trt_version(r".\models\yolo26l.engine")
