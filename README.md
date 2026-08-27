# AirSense Delhi

"AirSense Delhi" is a complete full-stack AQI (Air Quality Index) forecasting and smoke tracking web application for Delhi NCR. It predicts air pollution for the next 72 hours, tracks stubble burning fires, and gives people specific advice on what to do based on the pollution level.

## Architecture

- **Backend**: FastAPI (Python), SQLAlchemy, SQLite, Uvicorn, APScheduler.
- **Frontend**: React.js, Tailwind CSS, Recharts (graphs), Leaflet.js (maps), Axios.

## Project Structure

```
/airsense-delhi
  /backend
    main.py
    database.py
    models.py
    schemas.py
    services/
      aqi_service.py
      weather_service.py
      fire_service.py
      forecast_service.py
      advice_service.py
    .env
    requirements.txt
  /frontend
    /src
      /components
        Navbar.jsx
        AQIGauge.jsx
        StationMap.jsx
        ForecastChart.jsx
        InversionMeter.jsx
        AdviceCard.jsx
        FireMap.jsx
        FeedbackLoop.jsx
      /pages
        Dashboard.jsx
        SmokeTracker.jsx
        Advice.jsx
        HowItWorks.jsx
      App.jsx
      main.jsx
    index.html
    package.json
    tailwind.config.js
  README.md
```

## How to Run

### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate virtual environment (if created):
   ```bash
   .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

The backend server opens at: `http://localhost:8000`

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

The application opens at: `http://localhost:5173`

# AirSense Delhi - AQI Forecasting Dashboard
