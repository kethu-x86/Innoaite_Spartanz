from ultralytics import YOLO

# Load YOLOv11 Large model
model = YOLO("yolo26l.pt")   # change path if needed

# Export to TensorRT
model.export(
    format="engine",      # TensorRT engine
    imgsz=640,            # image size
    half=True,            # FP16 (great speed/accuracy balance)
    dynamic=True,         # dynamic batch & shapes
    simplify=True,        # ONNX graph optimization
)
