import os
import math
import datetime
import requests
from dotenv import load_dotenv

load_dotenv()

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").lower() == "true"
WAQI_API_KEY = os.getenv("WAQI_API_KEY", "")

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
    now = datetime.datetime.now()
    hour = now.hour
    minute = now.minute
    time_val = hour + (minute / 60.0)
    return int(15 * math.sin(time_val * math.pi / 12))

def get_current_aqi(db) -> dict:
    is_mock = USE_MOCK_DATA or not WAQI_API_KEY or WAQI_API_KEY == "your_key_here"
    
    if is_mock:
        variation = get_dynamic_mock_variation()
        aqi_val = 287 + variation
        pm25 = 116.5 + (variation * 0.4)
        pm10 = 185.0 + (variation * 0.6)
        o3 = 45.2 + (variation * 0.1)
        no2 = 32.1 + (variation * 0.15)
        timestamp = datetime.datetime.utcnow()
        
        cursor = db.cursor()
        cursor.execute('''
            INSERT INTO aqi_cache (station_name, aqi_value, pm25, pm10, o3, no2, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', ("Delhi Overall", aqi_val, pm25, pm10, o3, no2, timestamp))
        db.commit()
        
        label, color = get_aqi_label_and_color(aqi_val)
        return {
            "aqi_value": aqi_val,
            "pm25": round(pm25, 1),
            "pm10": round(pm10, 1),
            "o3": round(o3, 1),
            "no2": round(no2, 1),
            "color_code": color,
            "label": label,
            "timestamp": timestamp.isoformat(),
            "is_cached": False
        }
        
    try:
        url = f"https://api.waqi.info/feed/delhi/?token={WAQI_API_KEY}"
        res = requests.get(url, timeout=30)
        res.raise_for_status()
        data = res.json()
        
        if data.get("status") != "ok":
            raise Exception("WAQI API returned non-ok status: " + str(data.get("data")))
        
        iaqi = data["data"].get("iaqi", {})
        pm25 = iaqi.get("pm25", {}).get("v", 116.5)
        pm10 = iaqi.get("pm10", {}).get("v", 185.0)
        o3 = iaqi.get("o3", {}).get("v", 45.2)
        no2 = iaqi.get("no2", {}).get("v", 32.1)
        
        # Ensure aqi is an integer
        try:
            aqi_val = int(data["data"].get("aqi", calculate_indian_aqi_pm25(pm25)))
        except (ValueError, TypeError):
            aqi_val = calculate_indian_aqi_pm25(pm25)
            
        waqi_time = data["data"].get("time", {}).get("iso")
        if waqi_time:
            timestamp = waqi_time
        else:
            timestamp = datetime.datetime.utcnow().isoformat()
        
        cursor = db.cursor()
        cursor.execute('''
            INSERT INTO aqi_cache (station_name, aqi_value, pm25, pm10, o3, no2, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', ("Delhi Overall", aqi_val, pm25, pm10, o3, no2, timestamp))
        db.commit()
        
        label, color = get_aqi_label_and_color(aqi_val)
        return {
            "aqi_value": aqi_val,
            "pm25": round(pm25, 1),
            "pm10": round(pm10, 1),
            "o3": round(o3, 1),
            "no2": round(no2, 1),
            "color_code": color,
            "label": label,
            "timestamp": timestamp,
            "is_cached": False
        }
    except Exception as e:
        print(f"Error fetching current AQI: {e}. Checking cache.")
        cursor = db.cursor()
        cursor.execute('''
            SELECT aqi_value, pm25, pm10, o3, no2, timestamp 
            FROM aqi_cache 
            WHERE station_name = 'Delhi Overall' 
            ORDER BY timestamp DESC LIMIT 1
        ''')
        last_cache = cursor.fetchone()
        
        if last_cache:
            try:
                # If cache is older than 2 hours, raise exception to trigger frontend error state
                cache_time_str = last_cache['timestamp'].split('+')[0].replace('Z', '')
                cache_time = datetime.datetime.fromisoformat(cache_time_str)
                if (datetime.datetime.utcnow() - cache_time).total_seconds() > 7200:
                    raise Exception("Live data unavailable and cache is stale")
            except ValueError:
                # If timestamp parsing fails, assume stale
                raise Exception("Live data unavailable and cache timestamp invalid")
                
            label, color = get_aqi_label_and_color(last_cache['aqi_value'])
            return {
                "aqi_value": last_cache['aqi_value'],
                "pm25": round(last_cache['pm25'], 1),
                "pm10": round(last_cache['pm10'], 1),
                "o3": round(last_cache['o3'], 1),
                "no2": round(last_cache['no2'], 1),
                "color_code": color,
                "label": label,
                "timestamp": last_cache['timestamp'],
                "is_cached": True
            }
        else:
            raise Exception("Live data unavailable and no cache")

def get_stations_aqi(db) -> list:
    is_mock = USE_MOCK_DATA or not WAQI_API_KEY or WAQI_API_KEY == "your_key_here"
    stations_data = []
    variation = get_dynamic_mock_variation()
    cursor = db.cursor()
    
    for name, info in STATIONS.items():
        if is_mock:
            aqi_val = info["base_aqi"] + variation
            pm25 = info["base_pm25"] + (variation * 0.4)
            pm10 = (info["base_pm25"] * 1.5) + (variation * 0.6)
            
            cursor.execute('''
                INSERT INTO aqi_cache (station_name, aqi_value, pm25, pm10, o3, no2, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (name, aqi_val, pm25, pm10, 40.0, 30.0, datetime.datetime.utcnow()))
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
                url = f"https://api.waqi.info/feed/geo:{info['lat']};{info['lon']}/?token={WAQI_API_KEY}"
                res = requests.get(url, timeout=30)
                res.raise_for_status()
                data = res.json()
                
                if data.get("status") != "ok":
                    raise Exception("WAQI API returned non-ok status")
                    
                iaqi = data["data"].get("iaqi", {})
                pm25 = iaqi.get("pm25", {}).get("v", info["base_pm25"])
                pm10 = iaqi.get("pm10", {}).get("v", pm25 * 1.5)
                o3 = iaqi.get("o3", {}).get("v", 40.0)
                no2 = iaqi.get("no2", {}).get("v", 30.0)
                
                try:
                    aqi_val = int(data["data"].get("aqi", calculate_indian_aqi_pm25(pm25)))
                except (ValueError, TypeError):
                    aqi_val = calculate_indian_aqi_pm25(pm25)
                
                cursor.execute('''
                    INSERT INTO aqi_cache (station_name, aqi_value, pm25, pm10, o3, no2, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (name, aqi_val, pm25, pm10, o3, no2, datetime.datetime.utcnow().isoformat()))
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
                cursor.execute('''
                    SELECT aqi_value, pm25, timestamp 
                    FROM aqi_cache 
                    WHERE station_name = ? 
                    ORDER BY timestamp DESC LIMIT 1
                ''', (name,))
                last_cache = cursor.fetchone()
                
                if last_cache:
                    label, color = get_aqi_label_and_color(last_cache['aqi_value'])
                    stations_data.append({
                        "station_name": name,
                        "latitude": info["lat"],
                        "longitude": info["lon"],
                        "aqi_value": last_cache['aqi_value'],
                        "pm25": round(last_cache['pm25'], 1),
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
