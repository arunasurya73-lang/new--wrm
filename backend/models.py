import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime
from database import Base

class AQICache(Base):
    __tablename__ = "aqi_cache"

    id = Column(Integer, primary_key=True, index=True)
    station_name = Column(String, index=True)
    aqi_value = Column(Integer)
    pm25 = Column(Float)
    pm10 = Column(Float)
    o3 = Column(Float)
    no2 = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class WeatherCache(Base):
    __tablename__ = "weather_cache"

    id = Column(Integer, primary_key=True, index=True)
    temperature = Column(Float)
    wind_speed = Column(Float)
    wind_direction = Column(Float)
    surface_pressure = Column(Float)
    inversion_strength = Column(Integer)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class FireCache(Base):
    __tablename__ = "fire_cache"

    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    brightness = Column(Float)
    location_name = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class ForecastCache(Base):
    __tablename__ = "forecast_cache"

    id = Column(Integer, primary_key=True, index=True)
    hour_offset = Column(Integer)
    predicted_aqi = Column(Integer)
    predicted_pm25 = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String)
    email = Column(String)
    user_type = Column(String)
    rating = Column(Integer)
    message = Column(String)
    location = Column(String)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)

