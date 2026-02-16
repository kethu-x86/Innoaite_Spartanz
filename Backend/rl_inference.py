import os
import sys
import logging
import threading
import time
from collections import deque
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import pandas as pd
import joblib
import traci
import sumolib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Model Architectures ---

class QNetwork(nn.Module):
    """
    Neural Network for approximating the Q-function.
    Input: State vector
    Output: Q-values for each action
    """
    def __init__(self, state_size, action_size):
        super(QNetwork, self).__init__()
        self.layer1 = nn.Linear(state_size, 256)
        self.layer2 = nn.Linear(256, 256)
        self.layer3 = nn.Linear(256, 128)
        self.layer4 = nn.Linear(128, action_size)

    def forward(self, state):
        x = F.relu(self.layer1(state))
        x = F.relu(self.layer2(x))
        x = F.relu(self.layer3(x))
        return self.layer4(x)

class ResidualLSTM(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim, num_layers=3):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, 
                            batch_first=True, bidirectional=True, dropout=0.2)
        self.attention = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, 1)
        )
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, output_dim)
        )

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        attn_weights = torch.softmax(self.attention(lstm_out), dim=1)
        context = torch.sum(attn_weights * lstm_out, dim=1)
        return self.fc(context)

# --- Controller Logic ---

class TrafficController:
    def __init__(self):
        self.base_path = Path(__file__).parent / "mlmodels"
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"TrafficController using device: {self.device}")
        
        try:
            self._load_models()
            self.models_loaded = True
            logger.info("All RL models loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load RL models: {e}")
            self.models_loaded = False
            
        # State management
        self.history = deque(maxlen=60)
        self.last_counts = {'North': 0, 'South': 0, 'East': 0, 'West': 0}
        self.latest_metrics = {}

    def _load_models(self):

        # 1. Load Scalers
        self.scaler_x = joblib.load(self.base_path / 'scaler_x.pkl')
        self.scaler_y = joblib.load(self.base_path / 'scaler_y.pkl')

        # 2. Load LSTM
        self.lstm_model = ResidualLSTM(15, 128, 4).to(self.device)
        self.lstm_model.load_state_dict(torch.load(self.base_path / 'lstmv1.pth', map_location=self.device))
        self.lstm_model.eval()

        # 3. Load DQN (Policy)
        # Assuming metrics from Sim/run_rl_control.py: state_size=20, action_size=2
        self.dqn = QNetwork(state_size=20, action_size=2).to(self.device)
        self.dqn.load_state_dict(torch.load(self.base_path / 'dqn_active_model.pth', map_location=self.device))
        self.dqn.eval()

    def _compute_features(self, curr_counts, sim_time=None):
        """
        Compute features for the model. 
        If sim_time is None, use current system time or a mock.
        """
        if sim_time is None:
            # Fallback for YOLO mode (real-time)
            # Just map current hour of day
            import datetime
            now = datetime.datetime.now()
            # Convert to seconds since midnight
            sim_time = now.hour * 3600 + now.minute * 60 + now.second

        hour = (sim_time // 3600) % 24
        import datetime as _dt
        dow = _dt.datetime.now().weekday()  # 0=Monday, 6=Sunday

        # Calculate means from history
        if len(self.history) >= 10:
            h_list = list(self.history)
            # History structure: [N, S, E, W, sin, cos, dow, dN, dS, dE, dW, meanN, meanS, meanE, meanW]
            # Indices 0-3 are raw counts? No, 'features' in compute_features has structure:
            # 0-3: counts, 4-5: time, 6: dow, 7-10: deltas, 11-14: means
            # Actually, Sim/run_rl_control.py defines features as:
            # [curr_counts..., sin, cos, dow, deltas..., means...]
            # So means are indices 11, 12, 13, 14. 
            # Wait, the Sim code calculates means from history of FEATURES? 
            # "means = [np.mean([h[i] for h in h_list[-10:]]) for i in range(4)]"
            # It takes the first 4 elements of history items. Yes, those are the raw counts.
            means = [np.mean([h[i] for h in h_list[-10:]]) for i in range(4)]
        else:
            means = [curr_counts['North'], curr_counts['South'], curr_counts['East'], curr_counts['West']]

        features = [
            curr_counts['North'], curr_counts['South'], curr_counts['East'], curr_counts['West'],
            np.sin(2 * np.pi * hour / 24), np.cos(2 * np.pi * hour / 24), dow,
            curr_counts['North'] - self.last_counts['North'],
            curr_counts['South'] - self.last_counts['South'],
            curr_counts['East'] - self.last_counts['East'],
            curr_counts['West'] - self.last_counts['West'],
            means[0], means[1], means[2], means[3]
        ]
        return features, means

    # Phase-to-direction mapping for emergency preemption
    PHASE_GREEN_DIRS = {
        # Phases 0-3: East-West green
        0: ['East', 'West'], 1: ['East', 'West'],
        2: ['East', 'West'], 3: ['East', 'West'],
        # Phases 4-7: North-South green
        4: ['North', 'South'], 5: ['North', 'South'],
        6: ['North', 'South'], 7: ['North', 'South'],
    }

    def get_action(self, current_counts, sim_time=None, current_phase=0, emergency_direction=None):
        """
        Get the recommended traffic light action (0 or 1).
        Action 0: Keep phase
        Action 1: Switch phase
        
        If emergency_direction is set, bypasses DQN to preempt signal
        for the given direction.
        """
        # Emergency priority override — bypass the model entirely
        if emergency_direction:
            green_dirs = self.PHASE_GREEN_DIRS.get(current_phase, [])
            if emergency_direction in green_dirs:
                logger.info(f"🚨 Emergency: {emergency_direction} already has green (phase {current_phase}). Keeping.")
                return 0  # Already green for emergencydirection
            else:
                logger.info(f"🚨 Emergency: Switching to give {emergency_direction} green (from phase {current_phase}).")
                return 1  # Switch to give emergency direction green

        if not self.models_loaded:
            logger.warning("Models not loaded, returning default action 0")
            return 0

        # Transform counts keys if necessary (processor.py uses cam_id usually, need mapping)
        # For now assume current_counts has keys 'North', 'South', etc. or we map them.
        # If passed from YOLO processor, it might be raw dictionary.
        
        # Ensure we have the right keys and extract count if it's a dictionary (from YOLO processor)
        def get_val(v):
            if isinstance(v, dict):
                return int(v.get('count', 0))
            try:
                return int(v) if v is not None else 0
            except (ValueError, TypeError):
                return 0

        # Debugging: let's see what we are getting
        # logger.info(f"DEBUG RL RAW COUNTS: {current_counts}")

        safe_counts = {
            'North': get_val(current_counts.get('North')),
            'South': get_val(current_counts.get('South')),
            'East':  get_val(current_counts.get('East')),
            'West':  get_val(current_counts.get('West'))
        }

        features, means = self._compute_features(safe_counts, sim_time)
        self.history.append(features)
        self.last_counts = safe_counts.copy()

        # Handle cold start / warm-up
        if len(self.history) < 60:
            # Not enough history for LSTM
            # Pad with current feature? Or just return default
            # Let's replicate the current feature to fill history for a "immediate" start
            while len(self.history) < 60:
                self.history.append(features)
        
        try:
            with torch.no_grad():
                # 1. LSTM Prediction
                history_list = list(self.history)
                if hasattr(self.scaler_x, 'feature_names_in_'):
                    scaled_seq = self.scaler_x.transform(pd.DataFrame(history_list, columns=self.scaler_x.feature_names_in_))
                else:
                    scaled_seq = self.scaler_x.transform(history_list)
                
                x_input = np.expand_dims(scaled_seq, axis=0).astype(np.float32)
                preds_norm = self.lstm_model(torch.from_numpy(x_input).to(self.device))
                preds = self.scaler_y.inverse_transform(preds_norm.cpu().numpy())[0]

                # 2. DQN State
                # State: [features (15) + preds*0.3 (4) + phase (1)] = 20
                state = np.concatenate([features, preds * 0.3, [current_phase]]).astype(np.float32)
                
                # 3. Action
                state_tensor = torch.from_numpy(state).float().unsqueeze(0).to(self.device)
                action_values = self.dqn(state_tensor)
                action = np.argmax(action_values.cpu().data.numpy())
                
                # Store metrics for LLM summary
                self.latest_metrics = {
                    "action": int(action),
                    "current_phase": current_phase,
                    "avg_counts": {
                        "North": float(means[0]),
                        "South": float(means[1]),
                        "East": float(means[2]),
                        "West": float(means[3])
                    },
                    "predicted_congestion_index": float(preds.mean()) # Simple aggregate of LSTM output
                }

                return int(action)

        except Exception as e:

            logger.error(f"Inference error: {e}")
            import traceback
            traceback.print_exc()
            return 0 # Fail safe

# --- SUMO Management ---

class SumoManager:
    def __init__(self, controller: TrafficController):
        self.controller = controller
        self.lock = threading.Lock()
        self.sim_running = False
        self.sumo_cmd = None
        self.tl_id = None
        self.step_count = 0
        
        # Locate SUMO config
        # Assuming Sim directory is at ../Sim relative to Backend (cwd usually root of project)
        # Adjust as needed.
        self.sim_dir = Path(__file__).parent.parent / "Sim"
        self.sumo_cfg = self.sim_dir / "map.sumocfg"

    def start(self):
        with self.lock:
            if self.sim_running:
                logger.warning("Simulation already running.")
                return False, "Simulation already running"
            
            if not self.sumo_cfg.exists():
                return False, f"Config not found: {self.sumo_cfg}"

            try:
                # Use 'sumo-gui' to showcase the simulation
                sumo_binary = sumolib.checkBinary('sumo-gui')
                
                # Added --start to begin simulation immediately
                # Added --quit-on-end to close GUI when simulation finishes
                self.sumo_cmd = [sumo_binary, "-c", str(self.sumo_cfg), 
                                 "--waiting-time-memory", "1000", 
                                 "--no-warnings", "--start", "true", "--quit-on-end", "true"]
                traci.start(self.sumo_cmd)

                
                self.tl_id = traci.trafficlight.getIDList()[0]
                self.sim_running = True
                self.step_count = 0
                logger.info("SUMO simulation started.")
                return True, "Simulation started"
            except Exception as e:
                logger.error(f"Failed to start SUMO: {e}")
                self.sim_running = False
                return False, str(e)

    def step(self, emergency_direction=None):
        with self.lock:
            if not self.sim_running:
                return None, "Simulation not running"

            try:
                # 1. Get State
                curr_counts = self._get_directional_counts()
                sim_time = traci.simulation.getTime()
                curr_phase = traci.trafficlight.getPhase(self.tl_id)

                # 2. Get AI Action (with emergency override if active)
                action = self.controller.get_action(
                    curr_counts, sim_time, curr_phase, 
                    emergency_direction=emergency_direction
                )

                # 3. Apply Action
                if action == 1:
                     traci.trafficlight.setPhase(self.tl_id, (curr_phase + 1) % 8)
                
                # 4. Step Simulation
                traci.simulationStep()
                self.step_count += 1
                
                # 5. Collect Metrics
                metrics = self._get_metrics(curr_counts)
                metrics["action"] = action
                metrics["step"] = self.step_count
                
                # Sync with controller for /summary endpoint
                self.controller.latest_metrics.update(metrics)

                
                return metrics, None

            except Exception as e:
                logger.error(f"Error during simulation step: {e}")
                self.stop() # Force stop on error
                return None, str(e)

    def stop(self):
        with self.lock:
            if self.sim_running:
                try:
                    traci.close()
                    logger.info("SUMO simulation stopped.")
                except Exception as e:
                    logger.error(f"Error closing SUMO: {e}")
                finally:
                    self.sim_running = False
                return True, "Simulation stopped"
            return False, "Simulation not running"

    def _get_directional_counts(self):
        sensor_map = {
            'North': ["North_0", "North_1"],
            'South': ["South_0", "South_1"],
            'East':  ["East_0", "East_1"],
            'West':  ["West_0", "West_1"]
        }
        counts = {'North': 0, 'South': 0, 'East': 0, 'West': 0}
        try:
            for direction, sensors in sensor_map.items():
                for sensor_id in sensors:
                    counts[direction] += traci.inductionloop.getLastStepVehicleNumber(sensor_id)
        except Exception as e:
            logger.warning(f"Sensor read error in _get_directional_counts: {e}")
        return counts

    def _get_metrics(self, counts):
        controlled_lanes = traci.trafficlight.getControlledLanes(self.tl_id)
        waiting_time = sum([traci.lane.getWaitingTime(l) for l in controlled_lanes])
        queue_len = sum([traci.lane.getLastStepHaltingNumber(l) for l in controlled_lanes])
        
        # Get visualization data
        viz_data = {
            'North': self._get_lane_vehicles(["North_0", "North_1"]),
            'South': self._get_lane_vehicles(["South_0", "South_1"]),
            'East':  self._get_lane_vehicles(["East_0", "East_1"]),
            'West':  self._get_lane_vehicles(["West_0", "West_1"]),
            'tl_phase': traci.trafficlight.getPhase(self.tl_id)
        }

        # Detect emergency vehicles across all lanes
        emergency_vehicles = []
        for direction, vehs in viz_data.items():
            if direction == 'tl_phase':
                continue
            for v in vehs:
                vtype = v.get('type', '').lower()
                if 'emergency' in vtype or 'ambulance' in vtype or 'fire' in vtype or 'police' in vtype:
                    emergency_vehicles.append({
                        'id': v['id'],
                        'direction': direction,
                        'type': v['type'],
                        'pos': v['pos']
                    })
        
        return {
            "queue_length": queue_len,
            "waiting_time": waiting_time,
            "vehicle_count": counts,
            "viz": viz_data,
            "emergency_vehicles": emergency_vehicles
        }

    def _get_lane_vehicles(self, sensors):
        """Helper to get vehicles and their positions for specific sensors/lanes."""
        vehicles = []
        try:
            for sensor_id in sensors:
                lane_id = traci.inductionloop.getLaneID(sensor_id)
                lane_length = traci.lane.getLength(lane_id)
                veh_ids = traci.lane.getLastStepVehicleIDs(lane_id)
                for vid in veh_ids:
                    pos = traci.vehicle.getLanePosition(vid)
                    rel_pos = (lane_length - pos) / max(1, lane_length)
                    vehicles.append({
                        "id": vid,
                        "pos": rel_pos,
                        "type": traci.vehicle.getTypeID(vid)
                    })
        except Exception as e:
            logger.warning(f"Sensor read error in _get_lane_vehicles: {e}")
        return vehicles

