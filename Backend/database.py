import sqlite3
import uuid
import json
import logging
from datetime import datetime
from typing import Dict, Any

DB_PATH = "traffic_data.db"
logger = logging.getLogger(__name__)


def get_db_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Create INTERSECTION
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS INTERSECTION (
            intersection_id TEXT PRIMARY KEY,
            location_name TEXT,
            gps_coords TEXT
        )
        """)

        # Create TRAFFIC_LOG
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS TRAFFIC_LOG (
            log_id TEXT PRIMARY KEY,
            intersection_id TEXT,
            created_at TIMESTAMP,
            total_vehicle_count INTEGER,
            north_density REAL,
            south_density REAL,
            east_density REAL,
            west_density REAL,
            FOREIGN KEY(intersection_id) REFERENCES INTERSECTION(intersection_id)
        )
        """)

        # Create VIOLATION
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS VIOLATION (
            violation_id TEXT PRIMARY KEY,
            intersection_id TEXT,
            occurred_at TIMESTAMP,
            violation_type TEXT,
            vehicle_plate_blob TEXT,
            snapshot_path TEXT,
            FOREIGN KEY(intersection_id) REFERENCES INTERSECTION(intersection_id)
        )
        """)

        # Create SIGNAL_SCHEDULE
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS SIGNAL_SCHEDULE (
            schedule_id TEXT PRIMARY KEY,
            log_id TEXT,
            cycle_duration_seconds INTEGER,
            split_ratios TEXT,
            is_emergency_override BOOLEAN,
            FOREIGN KEY(log_id) REFERENCES TRAFFIC_LOG(log_id)
        )
        """)

        # Insert a default intersection if not exists
        cursor.execute(
            """
        INSERT OR IGNORE INTO INTERSECTION (intersection_id, location_name, gps_coords)
        VALUES (?, ?, ?)
        """,
            ("INT_01", "Kochi Junction", "9.9312, 76.2673"),
        )

        conn.commit()
    except Exception as e:
        logger.error(f"Error initializing DB: {e}")
    finally:
        conn.close()


def log_traffic_and_schedule(
    intersection_id: str,
    counts: Dict[str, Any],
    cycle_duration: int,
    split_ratios: dict,
    is_emergency: bool,
):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Insert Traffic Log
        log_id = str(uuid.uuid4())
        created_at = datetime.now().isoformat()

        north = counts.get("North", 0)
        south = counts.get("South", 0)
        east = counts.get("East", 0)
        west = counts.get("West", 0)
        total = north + south + east + west

        cursor.execute(
            """
        INSERT INTO TRAFFIC_LOG (log_id, intersection_id, created_at, total_vehicle_count, north_density, south_density, east_density, west_density)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                log_id,
                intersection_id,
                created_at,
                total,
                float(north),
                float(south),
                float(east),
                float(west),
            ),
        )

        # 2. Insert Signal Schedule
        schedule_id = str(uuid.uuid4())
        cursor.execute(
            """
        INSERT INTO SIGNAL_SCHEDULE (schedule_id, log_id, cycle_duration_seconds, split_ratios, is_emergency_override)
        VALUES (?, ?, ?, ?, ?)
        """,
            (
                schedule_id,
                log_id,
                cycle_duration,
                json.dumps(split_ratios),
                is_emergency,
            ),
        )

        conn.commit()
    except Exception as e:
        logger.error(f"Error logging traffic and schedule: {e}")
    finally:
        if "conn" in locals():
            conn.close()


def log_violation(
    intersection_id: str, violation_type: str, plate_blob: str, snapshot_path: str
):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        violation_id = str(uuid.uuid4())
        occurred_at = datetime.now().isoformat()

        cursor.execute(
            """
        INSERT INTO VIOLATION (violation_id, intersection_id, occurred_at, violation_type, vehicle_plate_blob, snapshot_path)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                violation_id,
                intersection_id,
                occurred_at,
                violation_type,
                plate_blob,
                snapshot_path,
            ),
        )

        conn.commit()
    except Exception as e:
        logger.error(f"Error logging violation: {e}")
    finally:
        if "conn" in locals():
            conn.close()


def get_intersections():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM INTERSECTION")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_traffic_logs(limit: int = 50, offset: int = 0):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM TRAFFIC_LOG ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_signal_schedules(limit: int = 50, offset: int = 0):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT s.*, t.created_at as log_time 
        FROM SIGNAL_SCHEDULE s 
        LEFT JOIN TRAFFIC_LOG t ON s.log_id = t.log_id 
        ORDER BY t.created_at DESC, s.schedule_id DESC 
        LIMIT ? OFFSET ?
    """,
        (limit, offset),
    )
    rows = cursor.fetchall()
    conn.close()

    res = []
    for r in rows:
        d = dict(r)
        if d.get("split_ratios") and isinstance(d["split_ratios"], str):
            try:
                d["split_ratios"] = json.loads(d["split_ratios"])
            except json.JSONDecodeError:
                pass
        res.append(d)
    return res


def get_violations(limit: int = 50, offset: int = 0):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM VIOLATION ORDER BY occurred_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
