import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Shield, Wind, Lock, Sun, RefreshCw, AlertCircle } from 'lucide-react';

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
      {/* New Live AQI Broadcast Hero */}
      {currentAQI && (
        <div className="w-full bg-[#0A0F1E] border border-gray-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
          {/* Subtle gradient glow behind AQI number */}
          <div 
            className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: currentAQI.color_code, transform: 'translate(-30%, -30%)' }}
          ></div>

          {/* Top Bar: LIVE badge and Title */}
          <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                  <span className="text-red-500 text-xs font-bold tracking-widest">LIVE</span>
                </div>
                <span className="text-xs text-gray-400 font-mono font-medium">Last Updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (Local Time)</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Delhi Air Quality Index (AQI) | Air Pollution</h1>
              <p className="text-sm text-gray-400 mt-1 font-medium">Real-time PM2.5, PM10 air pollution level in Delhi NCR</p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Big AQI Number */}
            <div className="lg:col-span-3 flex flex-col items-center md:items-start pl-4 md:pl-8">
              <div className="text-8xl md:text-9xl font-black leading-none drop-shadow-lg" style={{ color: currentAQI.color_code }}>
                {currentAQI.aqi_value}
              </div>
              <div className="text-sm text-gray-500 font-bold mt-2 ml-2 tracking-widest">AQI (US)</div>
            </div>

            {/* Center: Status & Scale */}
            <div className="lg:col-span-6 flex flex-col items-center w-full px-4">
              {/* Status Badge */}
              <div 
                className="px-8 py-3 rounded-full border-2 mb-10 flex flex-col items-center justify-center min-w-[220px] shadow-lg"
                style={{ backgroundColor: `${currentAQI.color_code}15`, borderColor: `${currentAQI.color_code}40` }}
              >
                <span className="text-[11px] text-gray-300 font-bold uppercase tracking-widest mb-1 opacity-80">Air Quality is</span>
                <span className="text-2xl font-black tracking-widest uppercase drop-shadow-md" style={{ color: currentAQI.color_code }}>{currentAQI.label}</span>
              </div>

              {/* Color Scale Bar */}
              <div className="w-full max-w-lg">
                <div className="relative h-4 w-full rounded-full bg-gray-800 mb-3 overflow-visible shadow-inner">
                  {/* Gradient Bar */}
                  <div className="absolute inset-0 rounded-full w-full h-full opacity-90" style={{
                    background: 'linear-gradient(to right, #10B981 0%, #10B981 10%, #FACC15 20%, #FACC15 30%, #F97316 40%, #F97316 50%, #EF4444 60%, #EF4444 70%, #A855F7 80%, #A855F7 90%, #991B1B 100%)'
                  }}></div>
                  
                  {/* Indicator Dot */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-[3px] border-white shadow-xl transition-all duration-1000 ease-out z-10"
                    style={{ 
                      left: `calc(${Math.min((currentAQI.aqi_value / 500) * 100, 100)}% - 12px)`,
                      backgroundColor: currentAQI.color_code 
                    }}
                  ></div>
                </div>
                
                {/* Scale Labels */}
                <div className="flex justify-between text-[11px] text-gray-400 font-mono font-bold px-2 mb-1.5">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                  <span>150</span>
                  <span>200</span>
                  <span>300</span>
                  <span>301+</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 font-black uppercase px-1 tracking-wider">
                  <span className="text-green-500/80">Good</span>
                  <span className="text-yellow-500/80">Mod</span>
                  <span className="text-orange-500/80">Poor</span>
                  <span className="text-red-500/80">Unhealthy</span>
                  <span className="text-purple-500/80">Severe</span>
                  <span className="text-red-900/80">Haz</span>
                </div>
              </div>

              {/* PM2.5 & PM10 */}
              <div className="flex gap-8 mt-10">
                <div className="bg-gray-900/60 border border-gray-700/50 px-6 py-3 rounded-xl flex flex-col items-center min-w-[120px] shadow-inner">
                  <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-1.5">PM2.5</span>
                  <span className="text-xl font-mono font-bold text-white">{currentAQI.pm25} <span className="text-xs text-gray-500 font-sans tracking-normal">μg/m³</span></span>
                </div>
                <div className="bg-gray-900/60 border border-gray-700/50 px-6 py-3 rounded-xl flex flex-col items-center min-w-[120px] shadow-inner">
                  <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-1.5">PM10</span>
                  <span className="text-xl font-mono font-bold text-white">{currentAQI.pm10} <span className="text-xs text-gray-500 font-sans tracking-normal">μg/m³</span></span>
                </div>
              </div>
            </div>

            {/* Right: Weather Card */}
            <div className="lg:col-span-3 flex justify-center md:justify-end pr-0 md:pr-4">
              {weather && (
                <div className="bg-white rounded-2xl p-6 shadow-2xl text-gray-900 w-full max-w-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex flex-col">
                      <span className="text-5xl font-black tracking-tighter text-gray-800">{weather.temperature}°C</span>
                      <span className="text-sm font-bold text-gray-500 mt-1 capitalize tracking-wide">{weather.condition || 'Clear'}</span>
                    </div>
                    <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-500 shadow-inner">
                      <Sun size={32} strokeWidth={2.5} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 border-t border-gray-200 pt-5 mt-2">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Humidity</span>
                      <span className="text-base font-black text-gray-700">{weather.humidity}%</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-gray-200">
                      <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Wind</span>
                      <span className="text-base font-black text-gray-700">{weather.wind_speed} <span className="text-[10px]">km/h</span></span>
                    </div>
                    <div className="flex flex-col items-center border-l border-gray-200">
                      <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">UV Index</span>
                      <span className="text-base font-black text-gray-700">
                        {new Date().getHours() >= 10 && new Date().getHours() <= 15 ? '6' : '1'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}

      {/* 4 Stat Cards & Inversion Meter */}
      <div className="flex flex-col justify-between space-y-6 mt-2">
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
