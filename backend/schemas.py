from pydantic import BaseModel
from typing import List, Dict, Any

class AQIResponse(BaseModel):
    aqi_value: int
    pm25: float
    pm10: float
    o3: float
    no2: float
    color_code: str
    label: str
    timestamp: str
    is_cached: bool

class StationAQIResponse(BaseModel):
    station_name: str
    latitude: float
    longitude: float
    aqi_value: int
    pm25: float
    label: str
    color_code: str

class WeatherResponse(BaseModel):
    temperature: float
    wind_speed: float
    wind_direction: float
    inversion_strength: int
    timestamp: str
    is_cached: bool

class InversionResponse(BaseModel):
    strength: int
    label: str
    description: str

class FireLocation(BaseModel):
    latitude: float
    longitude: float
    brightness: float
    location_name: str

class FiresResponse(BaseModel):
    fire_locations: List[FireLocation]
    count: int
    estimated_arrival_time: str
    estimated_arrival_hours: float

class ForecastItem(BaseModel):
    timestamp: str
    hour_offset: int
    predicted_aqi: int
    predicted_pm25: float
    has_smoke: bool

class BestTimeResponse(BaseModel):
    start_time: str
    end_time: str
    expected_aqi: int

class AdviceResponse(BaseModel):
    action_sentence: str
    aqi_level: int
    mini_forecast: List[Dict[str, Any]]
    why_section: str

class FeedbackLoopResponse(BaseModel):
    current_pm25: float
    estimated_sunlight_blocked: float
    inversion_tightening: str
    predicted_pm25_in_6_hours: float

class FeedbackCreate(BaseModel):
    name: str
    email: str
    user_type: str
    rating: int
    message: str
    location: str

class FeedbackResponse(BaseModel):
    id: int
    name: str
    email: str
    user_type: str
    rating: int
    message: str
    location: str
    submitted_at: str

    class Config:
        orm_mode = True

