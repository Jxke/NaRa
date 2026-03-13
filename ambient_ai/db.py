"""
db.py — SQLite database schema and access layer for the ambient AI assistant.
"""

import sqlite3
import time

from config import DB_PATH


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            sensor_data TEXT,
            transcription TEXT,
            assistant_response TEXT
        );

        CREATE TABLE IF NOT EXISTS hourly_context (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            summary TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS daily_context (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            summary TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS weekly_context (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            summary TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()


def insert_snapshot(sensor_data, transcription):
    conn = get_conn()
    conn.execute(
        "INSERT INTO snapshots (timestamp, sensor_data, transcription) VALUES (?, ?, ?)",
        (time.time(), sensor_data, transcription),
    )
    conn.commit()
    conn.close()


def update_snapshot_response(snapshot_id, response):
    conn = get_conn()
    conn.execute(
        "UPDATE snapshots SET assistant_response = ? WHERE id = ?",
        (response, snapshot_id),
    )
    conn.commit()
    conn.close()


def get_recent_snapshots(n):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM snapshots ORDER BY timestamp DESC LIMIT ?", (n,)
    ).fetchall()
    conn.close()
    return list(reversed(rows))


def get_snapshot_count_since(since_ts):
    conn = get_conn()
    count = conn.execute(
        "SELECT COUNT(*) FROM snapshots WHERE timestamp >= ?", (since_ts,)
    ).fetchone()[0]
    conn.close()
    return count


def get_snapshots_since(since_ts):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM snapshots WHERE timestamp >= ? ORDER BY timestamp ASC",
        (since_ts,),
    ).fetchall()
    conn.close()
    return rows


def insert_hourly(summary):
    conn = get_conn()
    conn.execute(
        "INSERT INTO hourly_context (timestamp, summary) VALUES (?, ?)",
        (time.time(), summary),
    )
    conn.commit()
    conn.close()


def insert_daily(summary):
    conn = get_conn()
    conn.execute(
        "INSERT INTO daily_context (timestamp, summary) VALUES (?, ?)",
        (time.time(), summary),
    )
    conn.commit()
    conn.close()


def insert_weekly(summary):
    conn = get_conn()
    conn.execute(
        "INSERT INTO weekly_context (timestamp, summary) VALUES (?, ?)",
        (time.time(), summary),
    )
    conn.commit()
    conn.close()


def get_recent_hourly(n):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM hourly_context ORDER BY timestamp DESC LIMIT ?", (n,)
    ).fetchall()
    conn.close()
    return list(reversed(rows))


def get_recent_daily(n):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM daily_context ORDER BY timestamp DESC LIMIT ?", (n,)
    ).fetchall()
    conn.close()
    return list(reversed(rows))


def get_recent_weekly(n):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM weekly_context ORDER BY timestamp DESC LIMIT ?", (n,)
    ).fetchall()
    conn.close()
    return list(reversed(rows))


def get_latest_snapshot_id():
    conn = get_conn()
    row = conn.execute(
        "SELECT id FROM snapshots ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()
    return row["id"] if row else None
