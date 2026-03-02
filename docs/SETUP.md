---
layout: default
title: Setup & Installation
nav_order: 4
---

# Setup & Installation Guide

Follow these steps to get the NeuroTraffic system running on your local machine.

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **SUMO (Simulation of Urban MObility)** installed and added to your system PATH.
- **CUDA-capable GPU** (Optional, but highly recommended for the AI models).

---

## 1. Backend Setup

1. **Navigate to the Backend folder**:

   ```bash
   cd Backend
   ```

2. **Create a Virtual Environment**:

   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install Dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

4. **Verify Models**:
   Ensure you have the YOLO engine in `Backend/models/` and the RL models in `Backend/mlmodels/`.

5. **Run the Server**:
   ```bash
   python main.py
   ```
   The backend will start at `http://localhost:8000`.

---

## 2. Frontend Setup

1. **Navigate to the Frontend folder**:

   ```bash
   cd Frontend/NeuroTraffic
   ```

2. **Install Packages**:

   ```bash
   npm install
   ```

3. **Set Environment Variables**:
   Create a `.env` file with:

   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The dashboard will be available at `http://localhost:5173`.

---

## 3. Running with No-ML Mode (Dev only)

If you don't have a GPU or the model files, you can still run the system in a mocked state:

```bash
# In the Backend folder
python main.py --no-ml
```

This will bypass the heavy AI loads while keeping the API endpoints active.
