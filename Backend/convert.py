from ultralytics import YOLO
import os

# Apply the tensorrt_lean workaround so Ultralytics can find TensorRT


def main():
    model_name = "yolo26l.pt"

    print(f"Loading {model_name}...")
    # Load the model (will automatically download if not present locally)
    model = YOLO(model_name)

    print(
        f"Exporting {model_name} to TensorRT engine format. This might take a while..."
    )
    # Export to TensorRT
    # use dynamic=False and half=True for optimized static shape FP16, or dynamic=True if variable sizes are needed
    model.export(format="engine", device="0", half=True)

    print("Export complete.")

    # Delete the .pt file
    if os.path.exists(model_name):
        print(f"Deleting the PyTorch model ({model_name})...")
        os.remove(model_name)
        print("Deleted.")
    else:
        print(f"Could not find {model_name} to delete.")

    # Delete the .onnx file
    onnx_name = model_name.replace(".pt", ".onnx")
    if os.path.exists(onnx_name):
        print(f"Deleting the ONNX model ({onnx_name})...")
        os.remove(onnx_name)
        print("Deleted.")

    # Move the .engine file
    engine_name = model_name.replace(".pt", ".engine")
    if os.path.exists(engine_name):
        import shutil

        os.makedirs("models", exist_ok=True)
        print(f"Moving {engine_name} to models folder...")
        shutil.move(engine_name, os.path.join("models", engine_name))
        print("Moved.")
    else:
        print(f"Could not find {engine_name} to move.")

    print("Conversion script finished successfully!")


if __name__ == "__main__":
    main()
