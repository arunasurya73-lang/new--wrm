import React from 'react';

function InversionMeter({ strength, label, description }) {
  // Map strength (1-10) to progress bar width and color
  const percentage = (strength / 10) * 100;
  
  const getColor = (str) => {
    if (str <= 2) return '#10B981'; // Green (Weak)
    if (str <= 4) return '#F59E0B'; // Amber (Moderate)
    if (str <= 7) return '#F97316'; // Orange (Strong)
    return '#EF4444'; // Red (Severe)
  };

  const color = getColor(strength);

  return (
    <div className="flex flex-col bg-cardBg border border-gray-800 rounded-card shadow-cardShadow p-5 w-full">
      <div className="flex items-center justify-between mb-4.5">
        <div>
          <h3 className="text-base font-semibold text-white">Atmospheric Inversion Lid Meter</h3>
          <p className="text-xs text-textSecondary mt-0.5">Measures vertical air trapping capacity over Delhi NCR</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold font-mono text-white leading-none">
            {strength}<span className="text-xs text-gray-500 font-normal">/10</span>
          </span>
          <span 
            className="text-[10px] font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded"
            style={{ 
              backgroundColor: `${color}15`, 
              color: color, 
              border: `1px solid ${color}35`
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full h-3.5 bg-gray-950 rounded-full border border-gray-900 overflow-hidden relative">
        {/* Color fill */}
        <div 
          className="h-full rounded-full transition-all-slow"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}50`
          }}
        ></div>
      </div>

      {/* Explanation Label */}
      <div className="mt-4 bg-[#080d1a] border border-gray-850 p-3 rounded-lg">
        <p className="text-xs text-textSecondary leading-relaxed">
          <strong className="text-white block mb-1">Impact:</strong>
          {description}
        </p>
      </div>
    </div>
  );
}

export default InversionMeter;
