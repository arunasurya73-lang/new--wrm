from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import datetime
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").lower() == "true"

print(f"API KEY LOADED: {OPENWEATHER_API_KEY[:8] if OPENWEATHER_API_KEY else 'None'}...")
print(f"MOCK MODE: {USE_MOCK_DATA}")

from database import init_db, get_db
from services.aqi_service import get_current_aqi, get_stations_aqi, get_aqi_label_and_color
from services.weather_service import get_weather_data, get_inversion_label_and_description
from services.fire_service import get_fires_data
from services.forecast_service import generate_72h_forecast, get_best_time_outside
from services.advice_service import get_advice

init_db()

app = Flask(__name__)
CORS(app, origins=["*"])

def refresh_cache_task():
    print(f"[{datetime.datetime.now()}] APScheduler background task starting...")
    db = get_db()
    try:
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

refresh_cache_task()
scheduler = BackgroundScheduler()
scheduler.add_job(refresh_cache_task, 'interval', minutes=30)
scheduler.start()

@app.route("/api/current-aqi", methods=["GET"])
def api_current_aqi():
    db = get_db()
    try:
        return jsonify(get_current_aqi(db))
    finally:
        db.close()

@app.route("/api/stations", methods=["GET"])
def api_stations():
    db = get_db()
    try:
        return jsonify(get_stations_aqi(db))
    finally:
        db.close()

@app.route("/api/weather", methods=["GET"])
def api_weather():
    db = get_db()
    try:
        return jsonify(get_weather_data(db))
    finally:
        db.close()

@app.route("/api/inversion", methods=["GET"])
def api_inversion():
    db = get_db()
    try:
        weather = get_weather_data(db)
        strength = weather["inversion_strength"]
        label, desc = get_inversion_label_and_description(strength)
        return jsonify({
            "strength": strength,
            "label": label,
            "description": desc
        })
    finally:
        db.close()

@app.route("/api/fires", methods=["GET"])
def api_fires():
    db = get_db()
    try:
        return jsonify(get_fires_data(db))
    finally:
        db.close()

@app.route("/api/forecast", methods=["GET"])
def api_forecast():
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute('''
            SELECT timestamp, hour_offset, predicted_aqi, predicted_pm25 
            FROM forecast_cache 
            ORDER BY hour_offset ASC
        ''')
        forecast = cursor.fetchall()
        
        if not forecast:
            return jsonify(generate_72h_forecast(db))
            
        res = []
        fires_data = get_fires_data(db)
        arrival_hours = fires_data["estimated_arrival_hours"]
        has_fires = fires_data["count"] > 0
        
        for item in forecast:
            h = item['hour_offset']
            has_smoke = False
            if has_fires and h >= arrival_hours and h < 48:
                has_smoke = True
                
            res.append({
                "timestamp": item['timestamp'],
                "hour_offset": h,
                "predicted_aqi": item['predicted_aqi'],
                "predicted_pm25": item['predicted_pm25'],
                "has_smoke": has_smoke
            })
        return jsonify(res)
    finally:
        db.close()

@app.route("/api/best-time", methods=["GET"])
def api_best_time():
    db = get_db()
    try:
        return jsonify(get_best_time_outside(db))
    finally:
        db.close()

@app.route("/api/advice/<user_type>", methods=["GET"])
def api_advice(user_type):
    if user_type not in ["worker", "parent", "hospital", "farmer"]:
        return jsonify({"detail": "Invalid user_type. Choose worker, parent, hospital, or farmer."}), 400
    db = get_db()
    try:
        return jsonify(get_advice(user_type, db))
    finally:
        db.close()

@app.route("/api/feedback-loop", methods=["GET"])
def api_feedback_loop():
    db = get_db()
    try:
        current = get_current_aqi(db)
        weather = get_weather_data(db)
        
        current_pm25 = current["pm25"]
        inversion_strength = weather["inversion_strength"]
        
        estimated_sunlight_blocked = min(current_pm25 * 0.13, 40.0)
        estimated_sunlight_blocked = round(estimated_sunlight_blocked, 1)
        
        inversion_tightening = "Yes" if (current_pm25 > 100.0 and inversion_strength >= 6) else "No"
        
        cursor = db.cursor()
        cursor.execute("SELECT predicted_pm25 FROM forecast_cache WHERE hour_offset = 6 LIMIT 1")
        forecast = cursor.fetchone()
        
        predicted_pm25_in_6_hours = forecast['predicted_pm25'] if forecast else current_pm25 + 10.0
        
        return jsonify({
            "current_pm25": current_pm25,
            "estimated_sunlight_blocked": estimated_sunlight_blocked,
            "inversion_tightening": inversion_tightening,
            "predicted_pm25_in_6_hours": predicted_pm25_in_6_hours
        })
    finally:
        db.close()

@app.route("/api/feedback", methods=["POST"])
def create_feedback():
    db = get_db()
    try:
        data = request.json
        cursor = db.cursor()
        cursor.execute('''
            INSERT INTO feedback (name, email, user_type, rating, message, location, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get("name"),
            data.get("email"),
            data.get("user_type"),
            data.get("rating"),
            data.get("message"),
            data.get("location"),
            datetime.datetime.utcnow()
        ))
        db.commit()
        return jsonify({"message": "Feedback submitted successfully"})
    finally:
        db.close()

@app.route("/api/feedback/all", methods=["GET"])
def get_all_feedback():
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute('''
            SELECT id, name, email, user_type, rating, message, location, submitted_at 
            FROM feedback 
            ORDER BY submitted_at DESC
        ''')
        feedbacks = cursor.fetchall()
        
        res = []
        for f in feedbacks:
            res.append({
                "id": f['id'],
                "name": f['name'],
                "email": f['email'],
                "user_type": f['user_type'],
                "rating": f['rating'],
                "message": f['message'],
                "location": f['location'],
                "submitted_at": f['submitted_at']
            })
        return jsonify(res)
    finally:
        db.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
