from dotenv import load_dotenv
import os
load_dotenv()

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").lower() == "true"

print(f"API KEY LOADED: {OPENWEATHER_API_KEY[:8]}...")
print(f"MOCK MODE: {USE_MOCK_DATA}")

import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from contextlib import asynccontextmanager

import models
import schemas
from database import engine, get_db, SessionLocal
from services.aqi_service import get_current_aqi, get_stations_aqi, get_aqi_label_and_color
from services.weather_service import get_weather_data, get_inversion_label_and_description
from services.fire_service import get_fires_data
from services.forecast_service import generate_72h_forecast, get_best_time_outside
from services.advice_service import get_advice

# 1. Create SQLite tables on startup
models.Base.metadata.create_all(bind=engine)

# 2. Setup Background Scheduler
def refresh_cache_task():
    print(f"[{datetime.datetime.now()}] APScheduler background task starting...")
    db = SessionLocal()
    try:
        # Fetch and cache all endpoints
        current = get_current_aqi(db)
        print(f"Cached current AQI: {current['aqi_value']}")
        
        stations = get_stations_aqi(db)
        print(f"Cached {len(stations)} stations")
        
        weather = get_weather_data(db)
        print(f"Cached weather: Temp {weather['temperature']}, Inversion {weather['inversion_strength']}")
        
        fires = get_fires_data(db)
        print(f"Cached fires: {fires['count']} detected")
        
        forecast = generate_72h_forecast(db)
        print(f"Cached {len(forecast)} forecast items")
        
        print(f"[{datetime.datetime.now()}] APScheduler background task completed successfully.")
    except Exception as e:
        print(f"Error during background cache refresh: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Cache and Scheduler
    print("FastAPI Application starting up...")
    refresh_cache_task() # Run once on startup
    
    scheduler = BackgroundScheduler()
    scheduler.add_job(refresh_cache_task, 'interval', minutes=30)
    scheduler.start()
    print("Background scheduler started. Job configured to run every 30 minutes.")
    
    yield
    # Shutdown: Stop Scheduler
    print("FastAPI Application shutting down...")
    scheduler.shutdown()

# Initialize FastAPI App
app = FastAPI(
    title="AirSense Delhi API",
    description="Backend API for the AirSense Delhi AQI Forecasting and Smoke Tracking web app.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend running locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ENDPOINTS ---

@app.get("/api/current-aqi", response_model=schemas.AQIResponse)
def api_current_aqi(db: Session = Depends(get_db)):
    return get_current_aqi(db)

@app.get("/api/stations", response_model=list[schemas.StationAQIResponse])
def api_stations(db: Session = Depends(get_db)):
    return get_stations_aqi(db)

@app.get("/api/weather", response_model=schemas.WeatherResponse)
def api_weather(db: Session = Depends(get_db)):
    return get_weather_data(db)

@app.get("/api/inversion", response_model=schemas.InversionResponse)
def api_inversion(db: Session = Depends(get_db)):
    weather = get_weather_data(db)
    strength = weather["inversion_strength"]
    label, desc = get_inversion_label_and_description(strength)
    return {
        "strength": strength,
        "label": label,
        "description": desc
    }

@app.get("/api/fires", response_model=schemas.FiresResponse)
def api_fires(db: Session = Depends(get_db)):
    return get_fires_data(db)

@app.get("/api/forecast", response_model=list[schemas.ForecastItem])
def api_forecast(db: Session = Depends(get_db)):
    # Try fetching from DB, if empty generate it
    forecast = db.query(models.ForecastCache).order_by(models.ForecastCache.hour_offset.asc()).all()
    if not forecast:
        return generate_72h_forecast(db)
        
    res = []
    # If fires are detected, we need to flag which hours have smoke.
    # Read arrival hours dynamically.
    fires_data = get_fires_data(db)
    arrival_hours = fires_data["estimated_arrival_hours"]
    has_fires = fires_data["count"] > 0
    
    for item in forecast:
        h = item.hour_offset
        has_smoke = False
        if has_fires and h >= arrival_hours and h < 48:
            has_smoke = True
            
        res.append({
            "timestamp": item.timestamp.isoformat(),
            "hour_offset": h,
            "predicted_aqi": item.predicted_aqi,
            "predicted_pm25": item.predicted_pm25,
            "has_smoke": has_smoke
        })
    return res

@app.get("/api/best-time", response_model=schemas.BestTimeResponse)
def api_best_time(db: Session = Depends(get_db)):
    return get_best_time_outside(db)

@app.get("/api/advice/{user_type}", response_model=schemas.AdviceResponse)
def api_advice(user_type: str, db: Session = Depends(get_db)):
    if user_type not in ["worker", "parent", "hospital", "farmer"]:
        raise HTTPException(status_code=400, detail="Invalid user_type. Choose worker, parent, hospital, or farmer.")
    return get_advice(user_type, db)

@app.get("/api/feedback-loop", response_model=schemas.FeedbackLoopResponse)
def api_feedback_loop(db: Session = Depends(get_db)):
    # Fetch current details
    current = get_current_aqi(db)
    weather = get_weather_data(db)
    
    current_pm25 = current["pm25"]
    inversion_strength = weather["inversion_strength"]
    
    # Calculate feedback loop metrics
    # PM2.5 blocks up to 40% of sunlight on severe days
    # Let's map PM2.5 to sunlight blocked percentage (e.g. 100 PM2.5 -> 10% blocked, 300 PM2.5 -> 30% blocked)
    # PM2.5 of 250+ (AQI 400+) should reach the 35%-40% range
    estimated_sunlight_blocked = min(current_pm25 * 0.13, 40.0)
    estimated_sunlight_blocked = round(estimated_sunlight_blocked, 1)
    
    # Inversion tightening logic: Yes if high particulates (PM2.5 > 100) and Strong Inversion (strength >= 6)
    inversion_tightening = "Yes" if (current_pm25 > 100.0 and inversion_strength >= 6) else "No"
    
    # Fetch forecast at offset hour 6 (+6 hours)
    forecast = db.query(models.ForecastCache).filter(models.ForecastCache.hour_offset == 6).first()
    predicted_pm25_in_6_hours = forecast.predicted_pm25 if forecast else current_pm25 + 10.0
    
    return {
        "current_pm25": current_pm25,
        "estimated_sunlight_blocked": estimated_sunlight_blocked,
        "inversion_tightening": inversion_tightening,
        "predicted_pm25_in_6_hours": predicted_pm25_in_6_hours
    }

@app.post("/api/feedback")
def create_feedback(feedback: schemas.FeedbackCreate, db: Session = Depends(get_db)):
    db_feedback = models.Feedback(
        name=feedback.name,
        email=feedback.email,
        user_type=feedback.user_type,
        rating=feedback.rating,
        message=feedback.message,
        location=feedback.location,
        submitted_at=datetime.datetime.utcnow()
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return {"message": "Feedback submitted successfully"}

@app.get("/api/feedback/all", response_model=list[schemas.FeedbackResponse])
def get_all_feedback(db: Session = Depends(get_db)):
    feedbacks = db.query(models.Feedback).order_by(models.Feedback.submitted_at.desc()).all()
    res = []
    for f in feedbacks:
        res.append({
            "id": f.id,
            "name": f.name,
            "email": f.email,
            "user_type": f.user_type,
            "rating": f.rating,
            "message": f.message,
            "location": f.location,
            "submitted_at": f.submitted_at.isoformat()
        })
    return res

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

