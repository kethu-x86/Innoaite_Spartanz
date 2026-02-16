# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY Frontend/react-app/package*.json ./
RUN npm install
COPY Frontend/react-app/ ./
RUN npm run build

# Stage 2: Final Image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV SUMO_HOME /usr/share/sumo

# Install system dependencies
RUN apt-get update && apt-get install -y \
    sumo sumo-tools \
    libgl1-mesa-glx libglib2.0-0 \
    libavdevice-dev libavfilter-dev libavformat-dev libavcodec-dev \
    libswresample-dev libswscale-dev libavutil-dev \
    pkg-config build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY Backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY Backend/ ./Backend/
COPY Sim/ ./Sim/
# Ensure the built frontend is available for the backend to serve
COPY --from=frontend-builder /app/frontend/dist ./Frontend/dist

# Expose the application port
EXPOSE 8000

# Run the application using the module path
CMD ["uvicorn", "Backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
