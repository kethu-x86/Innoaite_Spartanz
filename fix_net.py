import os

file_path = 'Sim/map.net.xml'
if os.path.exists(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    # We want to add these connections to allow Lane 1 to go straight as well
    new_connections = [
        '    <connection from="West_Entrance" to="East_Exit" fromLane="1" toLane="0" via=":Center_10_0" tl="Center" linkIndex="10" dir="s" state="o"/>\n',
        '    <connection from="South_Entrance" to="North_Exit" fromLane="1" toLane="0" via=":Center_7_0" tl="Center" linkIndex="7" dir="s" state="o"/>\n',
        '    <connection from="North_Entrance" to="South_Exit" fromLane="1" toLane="0" via=":Center_1_0" tl="Center" linkIndex="1" dir="s" state="o"/>\n',
        '    <connection from="East_Entrance" to="West_Exit" fromLane="1" toLane="0" via=":Center_4_0" tl="Center" linkIndex="4" dir="s" state="o"/>\n'
    ]
    
    # Insert before the first existing connection
    insert_pos = -1
    for i, line in enumerate(lines):
        if '<connection' in line:
            insert_pos = i
            break
            
    if insert_pos != -1:
        for new_conn in reversed(new_connections):
            lines.insert(insert_pos, new_conn)
            
        with open(file_path, 'w') as f:
            f.writelines(lines)
        print("Successfully added straight connections for Lane 1 in map.net.xml")
    else:
        print("Could not find connection section")
else:
    print("File not found")
