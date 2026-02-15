import os
import sys
import subprocess
import xml.etree.ElementTree as ET
import pandas as pd
import random
import traci

# Configuration
SUMO_CMD = "sumo" 
CONFIG_FILE = "map.sumocfg"
ROUTE_FILE = "map.rou.xml"
TRAINING_DATA_FILE = "lstm_training_data.csv"
SIMULATION_DAYS = 40
SIMULATION_STEPS = 86400 * SIMULATION_DAYS 
MAX_VEHICLES_PER_1MIN = 80.0

def generate_routes(filename):
    """Generates a route file with heavy, Kochi-inspired urban traffic."""
    print(f"Generating heavy traffic for {SIMULATION_DAYS} days...")
    
    with open(filename, "w") as f:
        f.write('<routes>\n')
        f.write('    <vType id="car" accel="2.0" decel="4.5" sigma="0.7" length="4.5" minGap="2.0" maxSpeed="13.89" guiShape="passenger"/>\n')
        f.write('    <vType id="bus" accel="1.0" decel="3.5" sigma="0.5" length="12" minGap="3.0" maxSpeed="11.11" guiShape="bus" color="1,0,0"/>\n')
        f.write('    <vType id="bike" accel="3.0" decel="5.0" sigma="0.9" length="2.0" minGap="0.5" maxSpeed="16.0" guiShape="motorcycle"/>\n')

        routes = {
            "NS": ["North_Entrance", "South_Exit"],
            "SN": ["South_Entrance", "North_Exit"],
            "EW": ["East_Entrance", "West_Exit"],
            "WE": ["West_Entrance", "East_Exit"]
        }
        
        for key, edges in routes.items():
            f.write(f'    <route id="route_{key}" edges="{" ".join(edges)}"/>\n')

        for day in range(SIMULATION_DAYS):
            day_offset = day * 86400
            is_weekend = (day % 7 >= 5)
            multiplier = 0.9 if is_weekend else 1.0

            intervals = [
                (0, 18000, 400),      # Early morning
                (18000, 25200, 900),    # Morning rush start
                (25200, 36000, 1600),   # Peak morning
                (36000, 54000, 1100),   # Daytime
                (54000, 61200, 1500),   # Evening rush start
                (61200, 75600, 1900),   # Peak evening
                (75600, 86400, 700)     # Night
            ]
            
            for begin, end, vph in intervals:
                adjusted_vph = vph * multiplier * random.uniform(0.98, 1.02)
                for route_key in routes.keys():
                    f.write(f'    <flow id="f_{day}_{begin}_{route_key}_c" begin="{day_offset+begin}" end="{day_offset+end}" vehsPerHour="{adjusted_vph*0.5}" route="route_{route_key}" type="car" departLane="best" departSpeed="max"/>\n')
                    f.write(f'    <flow id="f_{day}_{begin}_{route_key}_b" begin="{day_offset+begin}" end="{day_offset+end}" vehsPerHour="{adjusted_vph*0.4}" route="route_{route_key}" type="bike" departLane="best" departSpeed="max"/>\n')
                    f.write(f'    <flow id="f_{day}_{begin}_{route_key}_p" begin="{day_offset+begin}" end="{day_offset+end}" vehsPerHour="{adjusted_vph*0.1}" route="route_{route_key}" type="bus" departLane="best" departSpeed="max"/>\n')

        f.write('</routes>\n')

def run_simulation_and_collect_data():
    """Runs the simulation using TraCI and collects data in real-time."""
    print(f"Starting TraCI simulation for {SIMULATION_DAYS} days...")
    
    sumo_cmd = [
        SUMO_CMD, "-c", CONFIG_FILE,
        "--route-files", ROUTE_FILE,
        "--no-step-log", "true",
        "--time-to-teleport", "240",
        "--no-warnings", "true",
        "--step-length", "2.0"
    ]
    
    traci.start(sumo_cmd)
    
    # Get induction loop IDs from the simulation
    detectors = traci.inductionloop.getIDList()
    direction_map = {
        "North_0": "North", "North_1": "North",
        "South_0": "South", "South_1": "South",
        "East_0": "East", "East_1": "East",
        "West_0": "West", "West_1": "West"
    }
    
    raw_data = []
    current_step = 0
    
    bucket_size = 60
    counts = {d: 0 for d in ["North", "South", "East", "West"]}
    
    while current_step < SIMULATION_STEPS:
        # Step forward by bucket_size (60 seconds) in one go
        # This reduces TraCI overhead significantly
        current_step += bucket_size
        traci.simulationStep(current_step)
        
        # Collect data for the entire bucket period
        # Note: inductionloop.getLastIntervalVehicleNumber provides total count over the last default interval
        # But we'll sum up counts for each direction.
        # However, for training data, we just need the snapshot or cumulative for that bucket.
        for det_id in detectors:
            direction = direction_map.get(det_id)
            if direction:
                # getLastStepVehicleNumber on a large step gives vehicles on loop at the end of the step.
                # To get flow, we use interval data or cumulative.
                # Given the user's original logic, we'll use getLastIntervalVehicleNumber which usually aligns with intervals.
                num_passed = traci.inductionloop.getLastIntervalVehicleNumber(det_id)
                counts[direction] += num_passed
        
        time_bucket = current_step - bucket_size
        row = {'time_bucket': time_bucket}
        row.update(counts)
        raw_data.append(row)
        counts = {d: 0 for d in ["North", "South", "East", "West"]}
            
        if current_step % 3600 == 0:
            print(f"\rProgress: {current_step/SIMULATION_STEPS*100:.1f}% ({current_step}/{SIMULATION_STEPS} steps)", end="", flush=True)
            
    traci.close()
    print("\nSimulation finished. Processing data...")
    
    df = pd.DataFrame(raw_data)
    
    # Adding Time Features
    df['hour'] = (df['time_bucket'] % 86400) // 3600
    df['day_of_week'] = (df['time_bucket'] // 86400) % 7
    
    # Targets for LSTM (Predicting 30 mins ahead)
    for d in ['North', 'South', 'East', 'West']:
        df[f'target_{d}'] = df[d].shift(-30)

    df.dropna().to_csv(TRAINING_DATA_FILE, index=False)
    print(f"Completed! Dataset saved to {TRAINING_DATA_FILE}")

if __name__ == "__main__":
    if os.path.basename(os.getcwd()) != "Sim" and os.path.exists("Sim"):
        os.chdir("Sim")
    generate_routes(ROUTE_FILE)
    run_simulation_and_collect_data()