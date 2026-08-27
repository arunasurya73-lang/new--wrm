import os
import math
import datetime
import requests
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import models

load_dotenv()

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").lower() == "true"
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

STATIONS = {
    "Rohini": {"lat": 28.7489, "lon": 77.0758, "base_aqi": 312, "base_pm25": 128.0},
    "Connaught Place": {"lat": 28.6328, "lon": 77.2197, "base_aqi": 267, "base_pm25": 110.0},
    "Noida": {"lat": 28.5355, "lon": 77.3910, "base_aqi": 298, "base_pm25": 120.0},
    "Gurgaon": {"lat": 28.4595, "lon": 77.0266, "base_aqi": 243, "base_pm25": 100.0},
    "Faridabad": {"lat": 28.4089, "lon": 77.3178, "base_aqi": 289, "base_pm25": 117.0},
    "Dwarka": {"lat": 28.5921, "lon": 77.0460, "base_aqi": 276, "base_pm25": 112.0},
    "Anand Vihar": {"lat": 28.6469, "lon": 77.3164, "base_aqi": 334, "base_pm25": 138.0},
}

def calculate_indian_aqi_pm25(pm25: float) -> int:
    if pm25 <= 30:
        return int(((50 - 0) / (30 - 0)) * (pm25 - 0) + 0)
    elif pm25 <= 60:
        return int(((100 - 51) / (60 - 30)) * (pm25 - 30) + 51)
    elif pm25 <= 90:
        return int(((200 - 101) / (90 - 60)) * (pm25 - 60) + 101)
    elif pm25 <= 120:
        return int(((300 - 201) / (120 - 90)) * (pm25 - 90) + 201)
    elif pm25 <= 250:
        return int(((400 - 301) / (250 - 120)) * (pm25 - 120) + 301)
    elif pm25 <= 380:
        return int(((500 - 401) / (380 - 250)) * (pm25 - 250) + 401)
    else:
        return int(500 + (pm25 - 380))

def get_aqi_label_and_color(aqi: int):
    if aqi <= 50:
        return "Good", "#10B981"
    elif aqi <= 150:
        return "Moderate", "#F59E0B"
    elif aqi <= 250:
        return "Unhealthy", "#EF4444"
    elif aqi <= 350:
        return "Very Unhealthy", "#8B5CF6"
    else:
        return "Hazardous", "#7C2D12"

def get_dynamic_mock_variation() -> int:
    # Generate a time-based variation between -15 and +15
    now = datetime.datetime.now()
    hour = now.hour
    minute = now.minute
    time_val = hour + (minute / 60.0)
    return int(15 * math.sin(time_val * math.pi / 12))

def get_current_aqi(db: Session) -> dict:
    # Try fetching from OpenWeatherMap or use Cache or Mock
    is_mock = USE_MOCK_DATA or not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY == "your_key_here"
    
    if is_mock:
        variation = get_dynamic_mock_variation()
        aqi_val = 287 + variation
        # Calculate reverse PM2.5 roughly from AQI for realistic values
        pm25 = 116.5 + (variation * 0.4)
        pm10 = 185.0 + (variation * 0.6)
        o3 = 45.2 + (variation * 0.1)
        no2 = 32.1 + (variation * 0.15)
        
        # Save to DB cache
        cache_entry = models.AQICache(
            station_name="Delhi Overall",
            aqi_value=aqi_val,
            pm25=pm25,
            pm10=pm10,
            o3=o3,
            no2=no2,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(cache_entry)
        db.commit()
        db.refresh(cache_entry)
        
        label, color = get_aqi_label_and_color(aqi_val)
        return {
            "aqi_value": aqi_val,
            "pm25": round(pm25, 1),
            "pm10": round(pm10, 1),
            "o3": round(o3, 1),
            "no2": round(no2, 1),
            "color_code": color,
            "label": label,
            "timestamp": cache_entry.timestamp.isoformat(),
            "is_cached": False
        }
        
    try:
        url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat=28.6139&lon=77.2090&appid={OPENWEATHER_API_KEY}"
        res = requests.get(url, timeout=30)
        res.raise_for_status()
        data = res.json()
        
        components = data["list"][0]["components"]
        pm25 = components.get("pm2_5", 116.5)
        pm10 = components.get("pm10", 185.0)
        o3 = components.get("o3", 45.2)
        no2 = components.get("no2", 32.1)
        
        aqi_val = calculate_indian_aqi_pm25(pm25)
        
        # Save to database cache
        cache_entry = models.AQICache(
            station_name="Delhi Overall",
            aqi_value=aqi_val,
            pm25=pm25,
            pm10=pm10,
            o3=o3,
            no2=no2,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(cache_entry)
        db.commit()
        db.refresh(cache_entry)
        
        label, color = get_aqi_label_and_color(aqi_val)
        return {
            "aqi_value": aqi_val,
            "pm25": round(pm25, 1),
            "pm10": round(pm10, 1),
            "o3": round(o3, 1),
            "no2": round(no2, 1),
            "color_code": color,
            "label": label,
            "timestamp": cache_entry.timestamp.isoformat(),
            "is_cached": False
        }
    except Exception as e:
        print(f"Error fetching current AQI: {e}. Serving cached data.")
        # Fetch last saved from DB
        last_cache = db.query(models.AQICache).filter(models.AQICache.station_name == "Delhi Overall").order_by(models.AQICache.timestamp.desc()).first()
        if last_cache:
            label, color = get_aqi_label_and_color(last_cache.aqi_value)
            return {
                "aqi_value": last_cache.aqi_value,
                "pm25": round(last_cache.pm25, 1),
                "pm10": round(last_cache.pm10, 1),
                "o3": round(last_cache.o3, 1),
                "no2": round(last_cache.no2, 1),
                "color_code": color,
                "label": label,
                "timestamp": last_cache.timestamp.isoformat(),
                "is_cached": True
            }
        else:
            # Fallback to hard mock
            aqi_val = 287
            label, color = get_aqi_label_and_color(aqi_val)
            return {
                "aqi_value": aqi_val,
                "pm25": 116.5,
                "pm10": 185.0,
                "o3": 45.2,
                "no2": 32.1,
                "color_code": color,
                "label": label,
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "is_cached": True
            }

def get_stations_aqi(db: Session) -> list:
    is_mock = USE_MOCK_DATA or not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY == "your_key_here"
    stations_data = []
    
    variation = get_dynamic_mock_variation()
    
    for name, info in STATIONS.items():
        if is_mock:
            aqi_val = info["base_aqi"] + variation
            pm25 = info["base_pm25"] + (variation * 0.4)
            pm10 = (info["base_pm25"] * 1.5) + (variation * 0.6)
            
            # Save station to cache
            cache_entry = models.AQICache(
                station_name=name,
                aqi_value=aqi_val,
                pm25=pm25,
                pm10=pm10,
                o3=40.0,
                no2=30.0,
                timestamp=datetime.datetime.utcnow()
            )
            db.add(cache_entry)
            db.commit()
            
            label, color = get_aqi_label_and_color(aqi_val)
            stations_data.append({
                "station_name": name,
                "latitude": info["lat"],
                "longitude": info["lon"],
                "aqi_value": aqi_val,
                "pm25": round(pm25, 1),
                "label": label,
                "color_code": color
            })
        else:
            try:
                url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={info['lat']}&lon={info['lon']}&appid={OPENWEATHER_API_KEY}"
                res = requests.get(url, timeout=30)
                res.raise_for_status()
                data = res.json()
                components = data["list"][0]["components"]
                pm25 = components.get("pm2_5", info["base_pm25"])
                pm10 = components.get("pm10", pm25 * 1.5)
                o3 = components.get("o3", 40.0)
                no2 = components.get("no2", 30.0)
                
                aqi_val = calculate_indian_aqi_pm25(pm25)
                
                # Save station to cache
                cache_entry = models.AQICache(
                    station_name=name,
                    aqi_value=aqi_val,
                    pm25=pm25,
                    pm10=pm10,
                    o3=o3,
                    no2=no2,
                    timestamp=datetime.datetime.utcnow()
                )
                db.add(cache_entry)
                db.commit()
                
                label, color = get_aqi_label_and_color(aqi_val)
                stations_data.append({
                    "station_name": name,
                    "latitude": info["lat"],
                    "longitude": info["lon"],
                    "aqi_value": aqi_val,
                    "pm25": round(pm25, 1),
                    "label": label,
                    "color_code": color
                })
            except Exception as e:
                print(f"Error fetching station {name}: {e}. Serving from cache.")
                # Fetch from cache
                last_cache = db.query(models.AQICache).filter(models.AQICache.station_name == name).order_by(models.AQICache.timestamp.desc()).first()
                if last_cache:
                    label, color = get_aqi_label_and_color(last_cache.aqi_value)
                    stations_data.append({
                        "station_name": name,
                        "latitude": info["lat"],
                        "longitude": info["lon"],
                        "aqi_value": last_cache.aqi_value,
                        "pm25": round(last_cache.pm25, 1),
                        "label": label,
                        "color_code": color
                    })
                else:
                    # Fallback to base
                    aqi_val = info["base_aqi"]
                    label, color = get_aqi_label_and_color(aqi_val)
                    stations_data.append({
                        "station_name": name,
                        "latitude": info["lat"],
                        "longitude": info["lon"],
                        "aqi_value": aqi_val,
                        "pm25": info["base_pm25"],
                        "label": label,
                        "color_code": color
                    })
                    
    return stations_data
