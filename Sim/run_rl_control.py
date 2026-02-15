import os
import sys
import traci
import torch
import numpy as np
import pandas as pd
import joblib
from collections import deque
import torch.nn as nn
import warnings

# Suppress version-related warnings from sklearn/joblib
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

# --- Path Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_DIR = os.path.join(SCRIPT_DIR, 'train')

if TRAIN_DIR not in sys.path:
    sys.path.append(TRAIN_DIR)

try:
    from dqn_agent import DQN_Agent
except ImportError:
    sys.path.append(SCRIPT_DIR)
    from train.dqn_agent import DQN_Agent

# --- Model Architectures ---

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

# --- Helper Functions ---

def get_directional_counts():
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
    except Exception:
        pass
    return counts

def compute_features(curr_counts, last_counts, history, sim_time):
    hour = (sim_time // 3600) % 24
    dow = 0 # Placeholder for Day of Week
    
    # Calculate means from history
    if len(history) >= 10:
        h_list = list(history)
        means = [np.mean([h[i] for h in h_list[-10:]]) for i in range(4)]
    else:
        means = [curr_counts['North'], curr_counts['South'], curr_counts['East'], curr_counts['West']]

    features = [
        curr_counts['North'], curr_counts['South'], curr_counts['East'], curr_counts['West'],
        np.sin(2 * np.pi * hour / 24), np.cos(2 * np.pi * hour / 24), dow,
        curr_counts['North'] - last_counts['North'],
        curr_counts['South'] - last_counts['South'],
        curr_counts['East'] - last_counts['East'],
        curr_counts['West'] - last_counts['West'],
        means[0], means[1], means[2], means[3]
    ]
    return features

def run_rl_simulation():
    print("--- Traffic Control System Initialization ---")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # 1. Load Scalers
    scaler_x = joblib.load(os.path.join(TRAIN_DIR, 'scaler_x.pkl'))
    scaler_y = joblib.load(os.path.join(TRAIN_DIR, 'scaler_y.pkl'))

    # 2. Load LSTM
    lstm_model = ResidualLSTM(15, 128, 4).to(device)
    lstm_path = os.path.join(TRAIN_DIR, 'lstmv1.pth')
    if not os.path.exists(lstm_path):
        lstm_path = os.path.join(TRAIN_DIR, 'best_model.pth')
    lstm_model.load_state_dict(torch.load(lstm_path, map_location=device))
    lstm_model.eval()

    # 3. Initialize DQN Agent
    agent = DQN_Agent(state_size=20, action_size=2, seed=42, device=device)

    # 4. Start SUMO
    sumo_binary = "sumo-gui" 
    sumo_cfg = os.path.join(SCRIPT_DIR, "map.sumocfg")
    sumo_cmd = [sumo_binary, "-c", sumo_cfg, "--waiting-time-memory", "1000", "--no-warnings", "--start"]
    traci.start(sumo_cmd)
    
    tl_id = traci.trafficlight.getIDList()[0]
    history = deque(maxlen=60)
    last_counts = {'North': 0, 'South': 0, 'East': 0, 'West': 0}
    
    step = 0
    max_steps = 500000
    eps = 1.0 
    total_reward = 0
    ACTION_STEP = 5 

    print(f"Simulation loop starting for {max_steps} steps...")
    
    try:
        while traci.simulation.getMinExpectedNumber() > 0 and step < max_steps:
            # Get current data
            curr_counts = get_directional_counts()
            sim_time = traci.simulation.getTime()
            
            # Compute 15 context features
            features = compute_features(curr_counts, last_counts, history, sim_time)
            history.append(features)
            last_counts = curr_counts.copy()

            # Warm-up (need 60 steps of history for LSTM)
            if len(history) < 60:
                traci.simulationStep()
                step += 1
                continue 
            
            # --- Inference & Action ---
            
            # 1. LSTM Prediction
            history_list = list(history)
            if hasattr(scaler_x, 'feature_names_in_'):
                scaled_seq = scaler_x.transform(pd.DataFrame(history_list, columns=scaler_x.feature_names_in_))
            else:
                scaled_seq = scaler_x.transform(history_list)
            
            # Convert to numpy array with batch dimension first, then to tensor
            x_input = np.expand_dims(scaled_seq, axis=0).astype(np.float32)
            
            with torch.no_grad():
                preds_norm = lstm_model(torch.from_numpy(x_input).to(device))
                preds = scaler_y.inverse_transform(preds_norm.cpu().numpy())[0]

            # 2. DQN State (20 features)
            curr_phase = traci.trafficlight.getPhase(tl_id)
            state = np.concatenate([features, preds * 0.3, [curr_phase]]).astype(np.float32)
            
            # 3. Choose Action
            action = agent.choose_action(state, eps=eps)
            switch_penalty = 0
            if action == 1:
                traci.trafficlight.setPhase(tl_id, (curr_phase + 1) % 8) 
                switch_penalty = 2.0 
            
            # 4. Step Simulation (Collect history during action wait)
            for _ in range(ACTION_STEP):
                traci.simulationStep()
                step += 1
                # Keep history updated every second for LSTM continuity
                step_counts = get_directional_counts()
                step_features = compute_features(step_counts, last_counts, history, traci.simulation.getTime())
                history.append(step_features)
                last_counts = step_counts.copy()
            
            # 5. Observe Next State
            next_counts = get_directional_counts()
            next_phase = traci.trafficlight.getPhase(tl_id)
            next_features = compute_features(next_counts, last_counts, history, traci.simulation.getTime())
            
            # 6. Reward Calculation
            controlled_lanes = traci.trafficlight.getControlledLanes(tl_id)
            waiting_time = sum([traci.lane.getWaitingTime(l) for l in controlled_lanes])
            queue_len = sum([traci.lane.getLastStepHaltingNumber(l) for l in controlled_lanes])
            
            # Optimization: Provide a positive base reward for efficiency.
            # If the intersection is clear (Q=0), the agent gets +10. 
            # As queues build, this offsets into negative territory.
            reward = 10.0 - (waiting_time * 0.005 + queue_len * 0.5 + switch_penalty)
            
            # 7. Next DQN State
            next_state = np.concatenate([next_features, preds * 0.3, [next_phase]]).astype(np.float32)
            
            # 8. Learn
            agent.step(state, action, reward, next_state, False)
            
            total_reward += reward
            # Slower decay for 500k steps (reaches 0.05 around step 375,000)
            eps = max(0.05, eps * 0.99996)
            
            if step % 500 < ACTION_STEP:
                avg_r = total_reward / (step/ACTION_STEP + 1)
                print(f"Step {step} | Reward: {reward:.2f} | Avg R: {avg_r:.2f} | Eps: {eps:.3f} | Q: {queue_len}")

    except KeyboardInterrupt:
        print("\nTraining interrupted.")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
    finally:
        traci.close()
        save_path = os.path.join(TRAIN_DIR, "dqn_active_model.pth")
        agent.save_model(save_path)
        print(f"Simulation Ended. Model saved to: {save_path}")

if __name__ == "__main__":
    run_rl_simulation()
