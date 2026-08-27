import os
import math
import datetime
import requests
from dotenv import load_dotenv

load_dotenv()

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").lower() == "true"

def calculate_inversion_strength(temperature: float, wind_speed: float) -> int:
    if wind_speed < 5 and temperature < 15:
        t_factor = max(0, (15 - temperature) / 10)
        w_factor = max(0, (5 - wind_speed) / 5)
        strength = int(8 + (t_factor + w_factor) / 2 * 2)
        return min(10, max(8, strength))
    elif wind_speed < 10 and temperature < 20:
        t_factor = max(0, (20 - temperature) / 10)
        w_factor = max(0, (10 - wind_speed) / 5)
        strength = int(5 + (t_factor + w_factor) / 2 * 2)
        return min(7, max(5, strength))
    elif wind_speed < 15:
        w_factor = max(0, (15 - wind_speed) / 5)
        strength = int(3 + w_factor * 1)
        return min(4, max(3, strength))
    else:
        w_factor = min(1.0, (wind_speed - 15) / 20)
        strength = int(2 - w_factor * 1)
        return min(2, max(1, strength))

def get_inversion_label_and_description(strength: int) -> tuple:
    if strength >= 8:
        return "Severe", "Extreme trapping of pollutants. Cold air pool is locked below a warm atmospheric layer. High wind speed or daylight heating required to break the lid."
    elif strength >= 5:
        return "Strong", "Significant trapping of pollutants. Morning dispersion is highly restricted. Exercise outdoors should be postponed to afternoon."
    elif strength >= 3:
        return "Moderate", "Partial dispersion of pollutants. Wind speed is moderate, permitting gradual dilution."
    else:
        return "Weak", "Pollution dispersing freely. Normal horizontal and vertical mixing active."

def get_weather_data(db) -> dict:
    if USE_MOCK_DATA:
        now = datetime.datetime.now()
        hour = now.hour
        temperature = 14.5 + 4.5 * math.cos((hour - 14) * math.pi / 12)
        wind_speed = 4.2 + 3.0 * math.sin((hour - 6) * math.pi / 12)
        wind_speed = max(1.5, wind_speed)
        wind_direction = 310.0 + 20.0 * math.cos(hour * math.pi / 12)
        wind_direction %= 360.0
        
        inversion_strength = calculate_inversion_strength(temperature, wind_speed)
        timestamp = datetime.datetime.utcnow()
        
        cursor = db.cursor()
        cursor.execute('''
            INSERT INTO weather_cache (temperature, wind_speed, wind_direction, inversion_strength, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (temperature, wind_speed, wind_direction, inversion_strength, timestamp))
        db.commit()
        
        return {
            "temperature": round(temperature, 1),
            "wind_speed": round(wind_speed, 1),
            "wind_direction": round(wind_direction, 1),
            "inversion_strength": inversion_strength,
            "timestamp": timestamp.isoformat(),
            "is_cached": False
        }
        
    try:
        url = "https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&hourly=temperature_2m,windspeed_10m,winddirection_10m,surface_pressure&forecast_days=3"
        res = requests.get(url, timeout=30)
        res.raise_for_status()
        data = res.json()
        
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        
        utc_now = datetime.datetime.utcnow()
        now_str = utc_now.strftime("%Y-%m-%dT%H:00")
        
        idx = 0
        if now_str in times:
            idx = times.index(now_str)
        else:
            idx = utc_now.hour
            if idx >= len(times):
                idx = 0
                
        temperature = hourly.get("temperature_2m", [14.5])[idx]
        wind_speed = hourly.get("windspeed_10m", [4.2])[idx]
        wind_direction = hourly.get("winddirection_10m", [310.0])[idx]
        
        inversion_strength = calculate_inversion_strength(temperature, wind_speed)
        timestamp = datetime.datetime.utcnow()
        
        cursor = db.cursor()
        cursor.execute('''
            INSERT INTO weather_cache (temperature, wind_speed, wind_direction, inversion_strength, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (temperature, wind_speed, wind_direction, inversion_strength, timestamp))
        db.commit()
        
        return {
            "temperature": round(temperature, 1),
            "wind_speed": round(wind_speed, 1),
            "wind_direction": round(wind_direction, 1),
            "inversion_strength": inversion_strength,
            "timestamp": timestamp.isoformat(),
            "is_cached": False
        }
        
    except Exception as e:
        print(f"Error fetching weather: {e}. Serving from database cache.")
        cursor = db.cursor()
        cursor.execute('''
            SELECT temperature, wind_speed, wind_direction, inversion_strength, timestamp 
            FROM weather_cache 
            ORDER BY timestamp DESC LIMIT 1
        ''')
        last_cache = cursor.fetchone()
        
        if last_cache:
            return {
                "temperature": round(last_cache['temperature'], 1),
                "wind_speed": round(last_cache['wind_speed'], 1),
                "wind_direction": round(last_cache['wind_direction'], 1),
                "inversion_strength": last_cache['inversion_strength'],
                "timestamp": last_cache['timestamp'],
                "is_cached": True
            }
        else:
            temperature = 14.5
            wind_speed = 4.2
            wind_direction = 310.0
            inversion_strength = calculate_inversion_strength(temperature, wind_speed)
            return {
                "temperature": temperature,
                "wind_speed": wind_speed,
                "wind_direction": wind_direction,
                "inversion_strength": inversion_strength,
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "is_cached": True
            }
