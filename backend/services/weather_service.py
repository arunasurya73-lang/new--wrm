import os
import math
import datetime
import requests
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import models

load_dotenv()

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").lower() == "true"

def calculate_inversion_strength(temperature: float, wind_speed: float) -> int:
    # Logic:
    # if wind_speed < 5 and temperature < 15: strength = 8-10 (Severe)
    # if wind_speed < 10 and temperature < 20: strength = 5-7 (Strong)
    # if wind_speed < 15: strength = 3-4 (Moderate)
    # else: strength = 1-2 (Weak)
    
    if wind_speed < 5 and temperature < 15:
        # Severe
        # Scale to 8-10 based on how cold/calm it is
        # Temp below 15, wind below 5
        t_factor = max(0, (15 - temperature) / 10) # 0 to 1
        w_factor = max(0, (5 - wind_speed) / 5)     # 0 to 1
        strength = int(8 + (t_factor + w_factor) / 2 * 2)
        return min(10, max(8, strength))
    elif wind_speed < 10 and temperature < 20:
        # Strong (5-7)
        t_factor = max(0, (20 - temperature) / 10)
        w_factor = max(0, (10 - wind_speed) / 5)
        strength = int(5 + (t_factor + w_factor) / 2 * 2)
        return min(7, max(5, strength))
    elif wind_speed < 15:
        # Moderate (3-4)
        w_factor = max(0, (15 - wind_speed) / 5)
        strength = int(3 + w_factor * 1)
        return min(4, max(3, strength))
    else:
        # Weak (1-2)
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

def get_weather_data(db: Session) -> dict:
    if USE_MOCK_DATA:
        now = datetime.datetime.now()
        hour = now.hour
        # Base temperature: 14.5, with diurnal pattern
        temperature = 14.5 + 4.5 * math.cos((hour - 14) * math.pi / 12)
        # Base wind speed: 4.2, with night lull
        wind_speed = 4.2 + 3.0 * math.sin((hour - 6) * math.pi / 12)
        wind_speed = max(1.5, wind_speed)
        # Wind direction: 310 (NW) mostly, slight shifting
        wind_direction = 310.0 + 20.0 * math.cos(hour * math.pi / 12)
        wind_direction %= 360.0
        # Pressure
        surface_pressure = 1012.5 + 1.5 * math.sin(hour * math.pi / 12)
        
        inversion_strength = calculate_inversion_strength(temperature, wind_speed)
        
        # Save to DB cache
        cache_entry = models.WeatherCache(
            temperature=temperature,
            wind_speed=wind_speed,
            wind_direction=wind_direction,
            surface_pressure=surface_pressure,
            inversion_strength=inversion_strength,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(cache_entry)
        db.commit()
        db.refresh(cache_entry)
        
        return {
            "temperature": round(temperature, 1),
            "wind_speed": round(wind_speed, 1),
            "wind_direction": round(wind_direction, 1),
            "surface_pressure": round(surface_pressure, 1),
            "inversion_strength": inversion_strength,
            "timestamp": cache_entry.timestamp.isoformat(),
            "is_cached": False
        }
        
    try:
        url = "https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&hourly=temperature_2m,windspeed_10m,winddirection_10m,surface_pressure&forecast_days=3"
        res = requests.get(url, timeout=30)
        res.raise_for_status()
        data = res.json()
        
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        
        # Find index for current hour in UTC
        utc_now = datetime.datetime.utcnow()
        now_str = utc_now.strftime("%Y-%m-%dT%H:00")
        
        idx = 0
        if now_str in times:
            idx = times.index(now_str)
        else:
            # Find closest hour
            # Open-Meteo returns hourly list, we can approximate based on current hour in UTC
            idx = utc_now.hour
            if idx >= len(times):
                idx = 0
                
        temperature = hourly.get("temperature_2m", [14.5])[idx]
        # Open-Meteo returns wind speed in km/h by default or m/s. 
        # Check units in response, but standard API is km/h.
        wind_speed = hourly.get("windspeed_10m", [4.2])[idx]
        wind_direction = hourly.get("winddirection_10m", [310.0])[idx]
        surface_pressure = hourly.get("surface_pressure", [1012.5])[idx]
        
        inversion_strength = calculate_inversion_strength(temperature, wind_speed)
        
        cache_entry = models.WeatherCache(
            temperature=temperature,
            wind_speed=wind_speed,
            wind_direction=wind_direction,
            surface_pressure=surface_pressure,
            inversion_strength=inversion_strength,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(cache_entry)
        db.commit()
        db.refresh(cache_entry)
        
        return {
            "temperature": round(temperature, 1),
            "wind_speed": round(wind_speed, 1),
            "wind_direction": round(wind_direction, 1),
            "surface_pressure": round(surface_pressure, 1),
            "inversion_strength": inversion_strength,
            "timestamp": cache_entry.timestamp.isoformat(),
            "is_cached": False
        }
        
    except Exception as e:
        print(f"Error fetching weather: {e}. Serving from database cache.")
        last_cache = db.query(models.WeatherCache).order_by(models.WeatherCache.timestamp.desc()).first()
        if last_cache:
            return {
                "temperature": round(last_cache.temperature, 1),
                "wind_speed": round(last_cache.wind_speed, 1),
                "wind_direction": round(last_cache.wind_direction, 1),
                "surface_pressure": round(last_cache.surface_pressure, 1),
                "inversion_strength": last_cache.inversion_strength,
                "timestamp": last_cache.timestamp.isoformat(),
                "is_cached": True
            }
        else:
            # Hardcoded fallback
            temperature = 14.5
            wind_speed = 4.2
            wind_direction = 310.0
            surface_pressure = 1012.5
            inversion_strength = calculate_inversion_strength(temperature, wind_speed)
            return {
                "temperature": temperature,
                "wind_speed": wind_speed,
                "wind_direction": wind_direction,
                "surface_pressure": surface_pressure,
                "inversion_strength": inversion_strength,
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "is_cached": True
            }
