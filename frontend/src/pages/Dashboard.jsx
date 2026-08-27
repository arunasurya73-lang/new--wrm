import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Shield, Wind, Lock, Sun, RefreshCw, AlertCircle } from 'lucide-react';
import AQIGauge from '../components/AQIGauge';
import StationMap from '../components/StationMap';
import ForecastChart from '../components/ForecastChart';
import InversionMeter from '../components/InversionMeter';
import FeedbackLoop from '../components/FeedbackLoop';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentAQI, setCurrentAQI] = useState(null);
  const [stations, setStations] = useState([]);
  const [weather, setWeather] = useState(null);
  const [inversion, setInversion] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [bestTime, setBestTime] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        aqiRes,
        stationsRes,
        weatherRes,
        inversionRes,
        forecastRes,
        bestTimeRes,
        feedbackRes
      ] = await Promise.all([
        api.get('/api/current-aqi'),
        api.get('/api/stations'),
        api.get('/api/weather'),
        api.get('/api/inversion'),
        api.get('/api/forecast'),
        api.get('/api/best-time'),
        api.get('/api/feedback-loop')
      ]);

      setCurrentAQI(aqiRes.data);
      setStations(stationsRes.data);
      setWeather(weatherRes.data);
      setInversion(inversionRes.data);
      setForecast(forecastRes.data);
      setBestTime(bestTimeRes.data);
      setFeedback(feedbackRes.data);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to fetch current monitoring data. Verify backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-textSecondary space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="text-sm font-mono tracking-wider">Compiling atmospheric readings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-dangerColor space-y-4">
        <AlertCircle className="h-10 w-10 text-dangerColor" />
        <span className="text-sm text-center max-w-md leading-relaxed">{error}</span>
        <button 
          onClick={fetchData} 
          className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-semibold border border-blue-600/40 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Format best time outside for display
  const formatBestHours = (startIso, endIso) => {
    if (!startIso) return "2 PM - 4 PM";
    try {
      const start = new Date(startIso);
      const end = new Date(endIso);
      
      // Convert to local display (add 5.5 hours for IST if needed)
      // Since backend already handles offset or gives iso, we format directly
      const startLocal = new Date(start.getTime() + 5.5 * 60 * 60 * 1000);
      const endLocal = new Date(end.getTime() + 5.5 * 60 * 60 * 1000);
      
      const startStr = startLocal.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      const endStr = endLocal.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      return `${startStr} - ${endStr}`.replace(':00', '').toLowerCase();
    } catch {
      return "2pm - 4pm";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Upper Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core AQI Display */}
        <div className="lg:col-span-1">
          {currentAQI && (
            <AQIGauge 
              aqiValue={currentAQI.aqi_value} 
              label={currentAQI.label} 
              colorCode={currentAQI.color_code} 
            />
          )}
        </div>

        {/* 4 Stat Cards & Inversion Meter */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-6">
          {/* Stat Cards 2x2 on Mobile, 4x1 on Large screens */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat Card 1: PM2.5 */}
            <div className="bg-cardBg border border-gray-800 p-4 rounded-card shadow-cardShadow flex flex-col justify-between min-h-[100px]">
              <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider flex items-center">
                <Shield className="h-3.5 w-3.5 text-blue-500 mr-1.5" />
                PM2.5 Level
              </span>
              <div className="mt-3">
                <span className="text-2xl font-extrabold font-mono text-white leading-none">
                  {currentAQI?.pm25}
                </span>
                <span className="text-[10px] text-gray-500 font-mono ml-1">µg/m³</span>
              </div>
            </div>

            {/* Stat Card 2: Wind Speed */}
            <div className="bg-cardBg border border-gray-800 p-4 rounded-card shadow-cardShadow flex flex-col justify-between min-h-[100px]">
              <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider flex items-center">
                <Wind className="h-3.5 w-3.5 text-blue-500 mr-1.5" />
                Wind Speed
              </span>
              <div className="mt-3">
                <span className="text-2xl font-extrabold font-mono text-white leading-none">
                  {weather?.wind_speed}
                </span>
                <span className="text-[10px] text-gray-500 font-mono ml-1">km/h</span>
              </div>
            </div>

            {/* Stat Card 3: Inversion Strength */}
            <div className="bg-cardBg border border-gray-800 p-4 rounded-card shadow-cardShadow flex flex-col justify-between min-h-[100px]">
              <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider flex items-center">
                <Lock className="h-3.5 w-3.5 text-blue-500 mr-1.5" />
                Inversion Lid
              </span>
              <div className="mt-3">
                <span className="text-2xl font-extrabold font-mono text-white leading-none">
                  {weather?.inversion_strength}
                </span>
                <span className="text-[10px] text-gray-500 font-mono ml-1">/10</span>
              </div>
            </div>

            {/* Stat Card 4: Best Time Outside */}
            <div className="bg-cardBg border border-gray-800 p-4 rounded-card shadow-cardShadow flex flex-col justify-between min-h-[100px]">
              <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider flex items-center">
                <Sun className="h-3.5 w-3.5 text-blue-500 mr-1.5" />
                Best Hours
              </span>
              <div className="mt-3">
                <span className="text-sm font-extrabold text-green-400 leading-tight block">
                  {bestTime ? formatBestHours(bestTime.start_time, bestTime.end_time) : "2pm - 4pm"}
                </span>
                <span className="text-[9px] text-gray-500 leading-none">Lowest AQI window</span>
              </div>
            </div>
          </div>

          {/* Inversion Lid Meter */}
          {inversion && (
            <InversionMeter 
              strength={inversion.strength} 
              label={inversion.label} 
              description={inversion.description} 
            />
          )}
        </div>
      </div>

      {/* Delhi NCR map */}
      <div className="w-full">
        <StationMap stations={stations} />
      </div>

      {/* 72-Hour Forecast Chart */}
      <div className="w-full">
        <ForecastChart forecastData={forecast} />
      </div>

      {/* Real-time Feedback Loop */}
      {feedback && (
        <div className="w-full">
          <FeedbackLoop data={feedback} />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
