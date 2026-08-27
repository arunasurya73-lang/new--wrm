import sqlite3
import os

DB_PATH = "airsense.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS aqi_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station_name TEXT,
            aqi_value INTEGER,
            pm25 REAL,
            pm10 REAL,
            o3 REAL,
            no2 REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS weather_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            temperature REAL,
            wind_speed REAL,
            wind_direction REAL,
            inversion_strength INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS fire_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude REAL,
            longitude REAL,
            brightness REAL,
            location_name TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            user_type TEXT,
            rating INTEGER,
            message TEXT,
            location TEXT,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS forecast_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hour_offset INTEGER,
            predicted_aqi INTEGER,
            predicted_pm25 REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()
