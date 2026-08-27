import os
import datetime
from sqlalchemy.orm import Session
import models
from services.aqi_service import get_current_aqi
from services.weather_service import get_weather_data
from services.fire_service import get_fires_data

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").lower() == "true"

def generate_72h_forecast(db: Session) -> list:
    # 1. Get current base AQI
    current_aqi_data = get_current_aqi(db)
    base_aqi = current_aqi_data["aqi_value"]
    
    # 2. Get weather data (to check current inversion and wind)
    weather_data = get_weather_data(db)
    current_wind = weather_data["wind_speed"]
    current_inversion = weather_data["inversion_strength"]
    
    # 3. Get fire data
    fires_data = get_fires_data(db)
    has_fires = fires_data["count"] > 0
    arrival_hours = fires_data["estimated_arrival_hours"]
    
    forecast_list = []
    
    # Clear previous forecast cache
    db.query(models.ForecastCache).delete()
    
    now_local = datetime.datetime.now()
    
    for h in range(1, 73):
        future_time = now_local + datetime.timedelta(hours=h)
        future_hour = future_time.hour
        
        # Calculate adjustments
        # Time of day adjustments
        time_adj = 0.0
        if 6 <= future_hour <= 10:
            time_adj = 0.20 # Morning traffic/low temp surge
        elif 12 <= future_hour <= 15:
            time_adj = -0.15 # Afternoon sun dispersion
        elif future_hour >= 22 or future_hour <= 6:
            time_adj = 0.10 # Night pooling
            
        # Weather simulation for future hours
        # In general, night has stronger inversion, afternoon has weaker
        sim_inversion = current_inversion
        if 12 <= future_hour <= 16:
            sim_inversion = max(1, current_inversion - 4)
        elif future_hour >= 22 or future_hour <= 6:
            sim_inversion = min(10, current_inversion + 1)
            
        sim_wind = current_wind
        # On Day 3, simulate wind picking up to clear the air (specifically from hour 48 onwards)
        if h >= 48:
            sim_wind = max(sim_wind, 16.5) # Force wind speed to clear pollution
            sim_inversion = max(1, sim_inversion - 5)
        elif 12 <= future_hour <= 16:
            sim_wind = current_wind + 2.0
            
        inversion_adj = (sim_inversion - 5.0) * 0.03
        wind_adj = (5.0 - sim_wind) * 0.02
        
        # Calculate predicted AQI before smoke
        predicted = base_aqi * (1.0 + time_adj + inversion_adj + wind_adj)
        
        # Smoke adjustment: add 80-120 points when smoke is predicted to arrive
        smoke_points = 0.0
        has_smoke = False
        if has_fires and h >= arrival_hours:
            has_smoke = True
            # Build up and decay model
            hours_since_arrival = h - arrival_hours
            if hours_since_arrival <= 2:
                smoke_points = 80.0
            elif hours_since_arrival <= 12:
                smoke_points = 110.0 # Peak smoke impact
            else:
                # Slowly decay smoke impact over time
                smoke_points = max(0.0, 110.0 - 2.5 * (hours_since_arrival - 12))
                
        # If wind picked up on Day 3, smoke disperses much faster
        if h >= 48:
            smoke_points *= 0.1
            has_smoke = False
            
        predicted_aqi = int(predicted + smoke_points)
        
        # Cap the predictions between 30 and 500
        predicted_aqi = max(30, min(500, predicted_aqi))
        
        # Estimate PM2.5 roughly proportional to AQI
        # 116 PM2.5 matches 287 AQI, so ratio is ~0.4
        predicted_pm25 = round(predicted_aqi * 0.406, 1)
        
        # Format future time in ISO format (using UTC for standard representation)
        future_time_utc = datetime.datetime.utcnow() + datetime.timedelta(hours=h)
        
        forecast_item = models.ForecastCache(
            hour_offset=h,
            predicted_aqi=predicted_aqi,
            predicted_pm25=predicted_pm25,
            timestamp=future_time_utc
        )
        db.add(forecast_item)
        
        forecast_list.append({
            "timestamp": future_time_utc.isoformat(),
            "hour_offset": h,
            "predicted_aqi": predicted_aqi,
            "predicted_pm25": predicted_pm25,
            "has_smoke": has_smoke
        })
        
    db.commit()
    return forecast_list

def get_best_time_outside(db: Session) -> dict:
    # Find the 2-hour window with lowest predicted AQI TODAY
    # "Today" is within the next 24 hours of the forecast
    forecast = db.query(models.ForecastCache).order_by(models.ForecastCache.hour_offset.asc()).limit(24).all()
    
    if not forecast or len(forecast) < 2:
        # Fallback if no forecast in cache
        now = datetime.datetime.now()
        # Mock best time to go outside: 2pm to 4pm
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
        avg_aqi = (forecast[i].predicted_aqi + forecast[i+1].predicted_aqi) / 2.0
        if avg_aqi < best_avg:
            best_avg = avg_aqi
            best_index = i
            
    # Convert UTC timestamps in DB back to local ISO strings for response
    # We can just return the ISO string of the cached timestamp
    start_time = forecast[best_index].timestamp.isoformat()
    end_time = forecast[best_index + 1].timestamp.isoformat()
    
    return {
        "start_time": start_time,
        "end_time": end_time,
        "expected_aqi": int(best_avg)
    }
