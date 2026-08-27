import React from 'react';

function AQIGauge({ aqiValue, label, colorCode }) {
  // Get plain English descriptions based on AQI value
  const getAQIDescription = (val) => {
    if (val <= 50) {
      return "Air is clean and healthy today. Enjoy outdoor activities!";
    } else if (val <= 150) {
      return "Moderate air pollution. Sensitive individuals should limit prolonged outdoor exertion.";
    } else if (val <= 250) {
      return "Unhealthy air today. Wear a mask when going outside and avoid long physical work.";
    } else if (val <= 350) {
      return "Air is highly dangerous today. Avoid going outside if possible and keep windows closed.";
    } else {
      return "Hazardous atmospheric conditions. Remain indoors and run an air purifier.";
    }
  };

  const description = getAQIDescription(aqiValue);

  return (
    <div className="relative flex flex-col items-center justify-center p-6 bg-cardBg border border-gray-800 rounded-card shadow-cardShadow overflow-hidden min-h-[340px]">
      {/* Background soft glowing elements */}
      <div 
        className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full filter blur-[60px] opacity-20 -translate-x-1/2 -translate-y-1/2 transition-colors duration-1000"
        style={{ backgroundColor: colorCode }}
      ></div>

      {/* Pulsing Outer Circle */}
      <div className="relative flex items-center justify-center w-52 h-52">
        {/* Pulsing glow ring */}
        <div 
          className="absolute top-1/2 left-1/2 w-44 h-44 rounded-full animate-pulse-slow"
          style={{ 
            border: `3px solid ${colorCode}`,
            boxShadow: `0 0 25px ${colorCode}40`
          }}
        ></div>

        {/* Core Value Display */}
        <div className="z-10 flex flex-col items-center justify-center w-36 h-36 rounded-full bg-[#0d1221] border border-gray-800 shadow-inner">
          <span className="text-sm font-semibold tracking-wider text-textSecondary uppercase">AQI</span>
          <span className="text-5xl font-extrabold tracking-tighter text-white font-mono mt-0.5">
            {aqiValue}
          </span>
          <span className="text-xs text-gray-500 font-mono mt-1">Delhi NCR</span>
        </div>
      </div>

      {/* Pill label */}
      <div className="z-10 mt-6">
        <span 
          className="px-4.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md"
          style={{ 
            backgroundColor: `${colorCode}20`, 
            color: colorCode,
            border: `1px solid ${colorCode}50`
          }}
        >
          {label}
        </span>
      </div>

      {/* Description */}
      <p className="z-10 mt-4.5 text-center text-sm font-medium text-textSecondary max-w-sm leading-relaxed px-4">
        {description}
      </p>
    </div>
  );
}

export default AQIGauge;
