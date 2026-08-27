import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Flame, Clock, Navigation, AlertTriangle, RefreshCw } from 'lucide-react';
import FireMap from '../components/FireMap';

function SmokeTracker() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [firesData, setFiresData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [firesRes, weatherRes] = await Promise.all([
        api.get('/api/fires'),
        api.get('/api/weather')
      ]);
      setFiresData(firesRes.data);
      setWeatherData(weatherRes.data);
      
      // Initialize countdown based on estimated arrival hours
      const arrivalHours = firesRes.data.estimated_arrival_hours;
      const targetTimeMs = Date.now() + arrivalHours * 60 * 60 * 1000;
      localStorage.setItem('smoke_target_time', targetTimeMs.toString());
    } catch (err) {
      console.error("Error loading smoke tracker data:", err);
      setError("Failed to fetch fire and wind telemetry data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Live countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      const targetStr = localStorage.getItem('smoke_target_time');
      if (!targetStr) return;
      
      const targetTime = parseInt(targetStr, 10);
      const diffMs = targetTime - Date.now();
      
      if (diffMs <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      } else {
        const totalSecs = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSecs / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;
        setCountdown({ hours, minutes, seconds });
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [firesData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-textSecondary space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="text-sm font-mono tracking-wider">Parsing satellite fire anomalies...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-dangerColor space-y-4">
        <AlertTriangle className="h-10 w-10 text-dangerColor" />
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

  const T = firesData ? Math.round(firesData.estimated_arrival_hours) : 16;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-8rem)] pb-12 animate-fadeIn">
      {/* Interactive Map - spans 2 columns on large screens */}
      <div className="lg:col-span-2 h-[450px] lg:h-auto min-h-[450px]">
        {firesData && weatherData && (
          <FireMap 
            fireLocations={firesData.fire_locations} 
            windDirection={weatherData.wind_direction} 
            windSpeed={weatherData.wind_speed} 
          />
        )}
      </div>

      {/* Side Control Panel */}
      <div className="lg:col-span-1 flex flex-col space-y-6">
        {/* Fire Summary Card */}
        <div className="bg-cardBg border border-gray-800 rounded-card shadow-cardShadow p-5 flex flex-col">
          <div className="flex items-center space-x-3 pb-3.5 border-b border-gray-800">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400 animate-pulse">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Hotspots Detected</h3>
              <p className="text-xs text-textSecondary">Satellite observations (last 24 hours)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-[#0c1222] border border-gray-850 p-3.5 rounded-lg text-center">
              <span className="text-2xl font-extrabold font-mono text-red-500 block">
                {firesData ? firesData.count : 70}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Fires</span>
            </div>
            <div className="bg-[#0c1222] border border-gray-850 p-3.5 rounded-lg text-center flex flex-col justify-center">
              <span className="text-xs font-semibold text-white">Punjab, Haryana</span>
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1.5">States Affected</span>
            </div>
          </div>
        </div>

        {/* Live Countdown Card */}
        <div className="bg-cardBg border border-gray-800 rounded-card shadow-cardShadow p-5 flex flex-col">
          <div className="flex items-center space-x-3 pb-3.5 border-b border-gray-800">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Smoke Arrival Estimate</h3>
              <p className="text-xs text-textSecondary">Estimated boundary transport speed corridor</p>
            </div>
          </div>

          {/* Large Countdown timer */}
          <div className="mt-5 flex flex-col items-center justify-center bg-[#070b16] border border-gray-850 py-4.5 rounded-lg">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Estimated Arrival In</span>
            <div className="flex space-x-3 text-center">
              <div>
                <span className="text-3xl font-extrabold font-mono text-white bg-[#111827] px-2.5 py-1 rounded border border-gray-800">
                  {String(countdown.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">hours</span>
              </div>
              <span className="text-2xl font-bold text-gray-600">:</span>
              <div>
                <span className="text-3xl font-extrabold font-mono text-white bg-[#111827] px-2.5 py-1 rounded border border-gray-800">
                  {String(countdown.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">mins</span>
              </div>
              <span className="text-2xl font-bold text-gray-600">:</span>
              <div>
                <span className="text-3xl font-extrabold font-mono text-white bg-[#111827] px-2.5 py-1 rounded border border-gray-800">
                  {String(countdown.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">secs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transport Timeline */}
        <div className="bg-cardBg border border-gray-800 rounded-card shadow-cardShadow p-5 flex flex-col flex-1 justify-between">
          <div>
            <h3 className="text-base font-semibold text-white mb-4.5">Smoke Transport Forecast Timeline</h3>
            
            <div className="relative pl-6 border-l border-gray-800 space-y-6">
              {/* Step 1 */}
              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/20 border border-blue-500 text-[8px] text-blue-400 font-bold">1</span>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center">
                    Now
                    <span className="ml-2 px-1.5 py-0.5 text-[8px] bg-blue-500/10 text-blue-400 rounded-full font-bold uppercase">Active</span>
                  </h4>
                  <p className="text-[11px] text-textSecondary mt-0.5">Crop residue fires forming intense smoke columns in Northwest plains.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 border border-gray-700 text-[8px] text-textSecondary font-bold">2</span>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center">
                    +{T}h
                  </h4>
                  <p className="text-[11px] text-textSecondary mt-0.5">Wind carries dense PM2.5 boundary layer to the Delhi NCR border.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 border border-gray-700 text-[8px] text-textSecondary font-bold">3</span>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center">
                    +{T+4}h
                  </h4>
                  <p className="text-[11px] text-textSecondary mt-0.5">Peak concentration impact. Stagnant air pools smoke within the city basin.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 border border-gray-700 text-[8px] text-textSecondary font-bold">4</span>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center">
                    +{T+20}h
                  </h4>
                  <p className="text-[11px] text-textSecondary mt-0.5">Forecasted shift in boundary layer wind direction. Smoke begins to disperse.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-800 text-[10px] text-gray-500 leading-normal flex items-start space-x-1.5">
            <Navigation className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
            <span>Projections calculated using surface wind velocity scaled to planetary boundary layer (PBL) shear. Actual timings may vary with local turbulence.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SmokeTracker;
