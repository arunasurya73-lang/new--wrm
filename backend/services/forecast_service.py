import os
import datetime
from services.aqi_service import get_current_aqi
from services.weather_service import get_weather_data
from services.fire_service import get_fires_data

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").lower() == "true"

def generate_72h_forecast(db) -> list:
    current_aqi_data = get_current_aqi(db)
    base_aqi = current_aqi_data["aqi_value"]
    
    weather_data = get_weather_data(db)
    current_wind = weather_data["wind_speed"]
    current_inversion = weather_data["inversion_strength"]
    
    fires_data = get_fires_data(db)
    has_fires = fires_data["count"] > 0
    arrival_hours = fires_data["estimated_arrival_hours"]
    
    forecast_list = []
    
    cursor = db.cursor()
    cursor.execute("DELETE FROM forecast_cache")
    
    now_local = datetime.datetime.now()
    
    for h in range(1, 73):
        future_time = now_local + datetime.timedelta(hours=h)
        future_hour = future_time.hour
        
        time_adj = 0.0
        if 6 <= future_hour <= 10:
            time_adj = 0.20
        elif 12 <= future_hour <= 15:
            time_adj = -0.15
        elif future_hour >= 22 or future_hour <= 6:
            time_adj = 0.10
            
        sim_inversion = current_inversion
        if 12 <= future_hour <= 16:
            sim_inversion = max(1, current_inversion - 4)
        elif future_hour >= 22 or future_hour <= 6:
            sim_inversion = min(10, current_inversion + 1)
            
        sim_wind = current_wind
        if h >= 48:
            sim_wind = max(sim_wind, 16.5)
            sim_inversion = max(1, sim_inversion - 5)
        elif 12 <= future_hour <= 16:
            sim_wind = current_wind + 2.0
            
        inversion_adj = (sim_inversion - 5.0) * 0.03
        wind_adj = (5.0 - sim_wind) * 0.02
        
        predicted = base_aqi * (1.0 + time_adj + inversion_adj + wind_adj)
        
        smoke_points = 0.0
        has_smoke = False
        if has_fires and h >= arrival_hours:
            has_smoke = True
            hours_since_arrival = h - arrival_hours
            if hours_since_arrival <= 2:
                smoke_points = 80.0
            elif hours_since_arrival <= 12:
                smoke_points = 110.0
            else:
                smoke_points = max(0.0, 110.0 - 2.5 * (hours_since_arrival - 12))
                
        if h >= 48:
            smoke_points *= 0.1
            has_smoke = False
            
        predicted_aqi = int(predicted + smoke_points)
        predicted_aqi = max(30, min(500, predicted_aqi))
        
        predicted_pm25 = round(predicted_aqi * 0.406, 1)
        future_time_utc = datetime.datetime.utcnow() + datetime.timedelta(hours=h)
        
        cursor.execute('''
            INSERT INTO forecast_cache (hour_offset, predicted_aqi, predicted_pm25, timestamp)
            VALUES (?, ?, ?, ?)
        ''', (h, predicted_aqi, predicted_pm25, future_time_utc))
        
        forecast_list.append({
            "timestamp": future_time_utc.isoformat(),
            "hour_offset": h,
            "predicted_aqi": predicted_aqi,
            "predicted_pm25": predicted_pm25,
            "has_smoke": has_smoke
        })
        
    db.commit()
    return forecast_list

def get_best_time_outside(db) -> dict:
    cursor = db.cursor()
    cursor.execute('''
        SELECT hour_offset, predicted_aqi, predicted_pm25, timestamp 
        FROM forecast_cache 
        ORDER BY hour_offset ASC 
        LIMIT 24
    ''')
    forecast = cursor.fetchall()
    
    if not forecast or len(forecast) < 2:
        now = datetime.datetime.now()
        start_time = now.replace(hour=14, minute=0, second=0, microsecond=0)
        end_time = now.replace(hour=16, minute=0, second=0, microsecond=0)
        return {
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "expected_aqi": 190
        }
        
    best_avg = 9999.0
    best_index = 0
    
    for i in range(len(forecast) - 1):
        avg_aqi = (forecast[i]['predicted_aqi'] + forecast[i+1]['predicted_aqi']) / 2.0
        if avg_aqi < best_avg:
            best_avg = avg_aqi
            best_index = i
            
    start_time = forecast[best_index]['timestamp']
    end_time = forecast[best_index + 1]['timestamp']
    
    return {
        "start_time": start_time,
        "end_time": end_time,
        "expected_aqi": int(best_avg)
    }
