import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function ForecastChart({ forecastData }) {
  // Find the first index where smoke is predicted to arrive
  const smokeItem = forecastData.find(item => item.has_smoke);
  const smokeArrivalLabel = smokeItem ? new Date(smokeItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  const smokeArrivalTimestamp = smokeItem ? smokeItem.timestamp : null;

  // Format forecast data for display
  const chartData = forecastData.map(item => {
    const date = new Date(item.timestamp);
    // Add 5.5 hours to mock local Indian Standard Time if timestamps are UTC
    // (the service handles it, let's parse standard time display)
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dayString = date.toLocaleDateString([], { weekday: 'short' });
    
    return {
      ...item,
      displayTime: `${dayString} ${timeString}`,
      displayDay: dayString,
      aqi: item.predicted_aqi,
      pm25: item.predicted_pm25,
    };
  });

  // Custom tooltips for premium aesthetic
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#111827] border border-gray-800 p-3 rounded-lg shadow-xl text-xs font-sans">
          <p className="text-textSecondary font-semibold mb-1.5">{data.displayTime}</p>
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-gray-500 block">Predicted AQI</span>
              <span className="text-lg font-bold text-white font-mono">{data.aqi}</span>
            </div>
            <div>
              <span className="text-gray-500 block">PM2.5 (µg/m³)</span>
              <span className="text-lg font-bold text-blue-400 font-mono">{data.pm25}</span>
            </div>
          </div>
          {data.has_smoke && (
            <div className="mt-2 text-dangerColor font-semibold flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-dangerColor mr-1.5 animate-ping"></span>
              Stubble smoke active
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col bg-cardBg border border-gray-800 rounded-card shadow-cardShadow p-5 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b border-gray-800">
        <div>
          <h3 className="text-base font-semibold text-white">72-Hour AQI Forecast Trend</h3>
          <p className="text-xs text-textSecondary mt-0.5">Atmospheric projection model factoring in wind and local thermal inversions</p>
        </div>
        
        {smokeArrivalLabel && (
          <div className="mt-2 sm:mt-0 flex items-center bg-red-950/40 border border-red-900/60 px-3 py-1 rounded-full text-xs text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-dangerColor mr-2 animate-pulse"></span>
            Smoke Arrival: {smokeArrivalLabel}
          </div>
        )}
      </div>

      <div className="w-full h-[280px] sm:h-[320px] text-xs font-mono">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                <stop offset="50%" stopColor="#F59E0B" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis 
              dataKey="displayTime" 
              stroke="#4b5563"
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis 
              stroke="#4b5563" 
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Area under the curve */}
            <Area 
              type="monotone" 
              dataKey="aqi" 
              stroke="#3B82F6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#aqiGradient)" 
            />

            {/* Vertical line at smoke arrival */}
            {smokeArrivalTimestamp && (
              <ReferenceLine 
                x={forecastData.find(item => item.timestamp === smokeArrivalTimestamp)?.timestamp}
                stroke="#EF4444" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ 
                  value: 'Smoke arrives', 
                  fill: '#EF4444', 
                  position: 'top',
                  fontSize: 10,
                  fontWeight: 700,
                  className: 'bg-cardBg'
                }} 
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ForecastChart;
