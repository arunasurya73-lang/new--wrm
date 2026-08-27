import os
import datetime
import requests
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import models
from services.aqi_service import get_current_aqi
from services.forecast_service import get_best_time_outside

load_dotenv()

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"

def format_time_range(start_iso: str, end_iso: str) -> str:
    try:
        # DB stores UTC, so we can convert it or format it
        # Let's strip the T and seconds for a clean look, or format it properly
        # E.g. "2026-08-27T19:00:00" -> 19:00 (7:00 PM)
        # Since we want it to look premium:
        start_dt = datetime.datetime.fromisoformat(start_iso)
        end_dt = datetime.datetime.fromisoformat(end_iso)
        
        # Convert to local time representation (approx, since DB is UTC)
        # We can add 5.5 hours to mock Indian Standard Time (IST) if needed
        # Let's do that for the display to be correct!
        start_local = start_dt + datetime.timedelta(hours=5, minutes=30)
        end_local = end_dt + datetime.timedelta(hours=5, minutes=30)
        
        return f"{start_local.strftime('%I:%M %p')} to {end_local.strftime('%I:%M %p')}"
    except Exception:
        return "2:00 PM to 4:00 PM"

def get_wind_forecast_48h() -> list:
    is_mock = USE_MOCK_DATA
    if is_mock:
        # Mock forecast wind directions:
        # NW (310) for first 16 hours, then shifting to SE (140)
        directions = []
        for h in range(48):
            if h < 16:
                directions.append(310.0) # Towards Delhi
            else:
                directions.append(140.0) # Away from Delhi
        return directions
        
    try:
        url = "https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&hourly=winddirection_10m&forecast_days=2"
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        data = res.json()
        return data.get("hourly", {}).get("winddirection_10m", [310.0] * 48)
    except Exception:
        # Fallback to mock
        directions = []
        for h in range(48):
            if h < 16:
                directions.append(310.0)
            else:
                directions.append(140.0)
        return directions

def get_advice(user_type: str, db: Session) -> dict:
    current_aqi_data = get_current_aqi(db)
    aqi_val = current_aqi_data["aqi_value"]
    
    # Get mini forecast (next 24 hours of AQI)
    forecast = db.query(models.ForecastCache).order_by(models.ForecastCache.hour_offset.asc()).limit(24).all()
    mini_forecast = []
    for item in forecast:
        # Add 5.5 hours for IST display in the mini graph
        local_time = item.timestamp + datetime.timedelta(hours=5, minutes=30)
        mini_forecast.append({
            "timestamp": local_time.strftime("%I %p"),
            "predicted_aqi": item.predicted_aqi
        })
        
    if not mini_forecast:
        # Fallback mini forecast
        for h in range(1, 25):
            mini_forecast.append({
                "timestamp": f"+{h}h",
                "predicted_aqi": aqi_val
            })
            
    # Process by user type
    if user_type == "worker":
        if aqi_val < 150:
            action = "Safe to work outside. No special precautions needed."
            why = f"The AQI is currently {aqi_val} (Moderate). Air quality is acceptable for outdoor physical labor."
        elif aqi_val <= 250:
            best_time_data = get_best_time_outside(db)
            time_range_str = format_time_range(best_time_data["start_time"], best_time_data["end_time"])
            action = f"Wear N95 mask. Take breaks indoors every 2 hours. Best time to work outside today is {time_range_str}."
            why = f"The AQI is {aqi_val} (Unhealthy). Outdoor exertion causes rapid respiration, drawing fine PM2.5 deep into the lungs. N95 filtration and frequent indoor breaks protect cardiovascular health."
        else:
            action = "Extremely dangerous. Request indoor work if possible. If you must go out, wear N95 mask and limit to 1 hour maximum."
            why = f"The AQI is {aqi_val} (Very Unhealthy / Hazardous). Ambient air contains heavy load of toxic aerosols. Prolonged outdoor work poses severe risk of acute respiratory distress and systemic inflammation."
            
    elif user_type == "parent":
        if aqi_val < 150:
            action = "School outdoor activities are safe today."
            why = f"The AQI is {aqi_val}. Normal playtime and sports can proceed without restriction."
        elif aqi_val <= 250:
            action = "Cancel outdoor PE and sports. Keep children indoors during recess."
            why = f"The AQI is {aqi_val}. Children's lungs are developing and they breathe more rapidly than adults. Canceling outdoor sports prevents heavy inhalation of particulate matter."
        else:
            action = "Recommend school closure or full indoor schedule. Do not send children outside."
            why = f"The AQI is {aqi_val}. The atmospheric air is hazardous. Children must remain in sealed indoor spaces, ideally with HEPA air filtration. Commuting to school exposes them to extreme risk."
            
    elif user_type == "hospital":
        if aqi_val < 150:
            action = "Normal operations. No surge expected."
            why = f"The AQI is {aqi_val}. Emergency rooms should expect standard baseline patient volumes."
        elif aqi_val <= 250:
            action = "Expect 25% increase in respiratory patients in next 12 hours. Alert pulmonology ward."
            why = f"The AQI is {aqi_val}. History shows a lag of 6-12 hours between AQI spikes and ER admissions for asthma and COPD exacerbations. Preparing nebulizer stations is recommended."
        else:
            action = "Expect 50-60% patient surge in next 6 hours. Activate emergency respiratory protocol."
            why = f"The AQI is {aqi_val}. Extreme pollution triggers immediate acute asthma attacks, stroke, and cardiovascular events. Mobilize additional ICU beds, oxygen supplies, and respiratory therapists."
            
    elif user_type == "farmer":
        # Calculate wind direction for next 48 hours
        directions = get_wind_forecast_48h()
        
        # Check if wind is blowing towards Delhi: 270 to 360 or 0 to 45
        def blows_to_delhi(deg):
            return (270.0 <= deg <= 360.0) or (0.0 <= deg <= 45.0)
            
        current_blows_delhi = blows_to_delhi(directions[0])
        
        if current_blows_delhi:
            # Find when it shifts away
            shift_hour = -1
            for h in range(1, 48):
                # Look for a window of at least 6 hours where it stays safe
                if not blows_to_delhi(directions[h]):
                    is_window_safe = True
                    for k in range(h, min(h + 6, 48)):
                        if blows_to_delhi(directions[k]):
                            is_window_safe = False
                            break
                    if is_window_safe:
                        shift_hour = h
                        break
            
            if shift_hour != -1:
                future_time = datetime.datetime.now() + datetime.timedelta(hours=shift_hour)
                time_str = future_time.strftime("%A, %I:%M %p")
                action = f"Do NOT burn fields in next {shift_hour} hours. Wind is blowing directly toward Delhi affecting 2 crore people. Safe burn window: {time_str}."
            else:
                action = "Do NOT burn fields in next 48 hours. Wind is blowing directly toward Delhi affecting 2 crore people. Safe burn window: No safe window in next 48 hours."
                
            why = "Current atmospheric circulation creates a direct transport corridor from crop fields to the Delhi NCR basin. Burning now will immediately exacerbate the hazardous pollution crisis."
        else:
            # Current wind is safe (blowing away). Find how long it remains safe.
            unsafe_hour = -1
            for h in range(1, 48):
                if blows_to_delhi(directions[h]):
                    unsafe_hour = h
                    break
            
            if unsafe_hour != -1:
                action = f"Wind direction is currently safe. If you must burn, next {unsafe_hour} hours is the least harmful window."
            else:
                action = "Wind direction is currently safe. If you must burn, the next 48 hours is a safe window."
                
            why = "Winds are currently carrying air masses away from Delhi towards sparse regions. However, crop burning should still be minimized. If unavoidable, burn during this wind window."
    else:
        action = "Observe local AQI guidelines."
        why = "No specific profile selected. Stay indoors when AQI exceeds 150."
        
    return {
        "action_sentence": action,
        "aqi_level": aqi_val,
        "mini_forecast": mini_forecast,
        "why_section": why
    }
