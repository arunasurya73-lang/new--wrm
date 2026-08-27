import React from 'react';
import { SunDim, ThermometerSnowflake, Lock, AlertTriangle } from 'lucide-react';

function FeedbackLoop({ data }) {
  const { current_pm25, estimated_sunlight_blocked, inversion_tightening, predicted_pm25_in_6_hours } = data;

  return (
    <div className="flex flex-col bg-cardBg border border-gray-800 rounded-card shadow-cardShadow p-5 w-full">
      <div className="border-b border-gray-800 pb-4 mb-5">
        <h3 className="text-base font-semibold text-white flex items-center">
          <SunDim className="h-5 w-5 text-amber-500 mr-2 animate-spin-slow" style={{ animationDuration: '10s' }} />
          Real-Time Feedback Cycle Metrics
        </h3>
        <p className="text-xs text-textSecondary mt-0.5">Scientific variables showing how pollution reinforces the atmospheric lid</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: PM2.5 */}
        <div className="bg-[#0c1222] border border-gray-850 p-4 rounded-lg flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Current PM2.5</span>
            <span className="text-xl font-bold font-mono text-white">{current_pm25}</span>
            <span className="text-[10px] text-gray-500 font-mono ml-1">µg/m³</span>
          </div>
        </div>

        {/* Metric 2: Sunlight Blocked */}
        <div className="bg-[#0c1222] border border-gray-850 p-4 rounded-lg flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
            <SunDim className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Sunlight Blocked</span>
            <span className="text-xl font-bold font-mono text-amber-400">{estimated_sunlight_blocked}%</span>
            <span className="text-[9px] text-gray-500 block mt-0.5">by particulate layer</span>
          </div>
        </div>

        {/* Metric 3: Inversion Tightening */}
        <div className="bg-[#0c1222] border border-gray-850 p-4 rounded-lg flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${inversion_tightening === 'Yes' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Lid Tightening</span>
            <span className={`text-xl font-bold ${inversion_tightening === 'Yes' ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
              {inversion_tightening}
            </span>
            <span className="text-[9px] text-gray-500 block mt-0.5">Self-reinforcing loop</span>
          </div>
        </div>

        {/* Metric 4: Predicted PM2.5 in 6h */}
        <div className="bg-[#0c1222] border border-gray-850 p-4 rounded-lg flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <ThermometerSnowflake className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">PM2.5 (In 6 Hours)</span>
            <span className="text-xl font-bold font-mono text-white">{predicted_pm25_in_6_hours}</span>
            <span className="text-[10px] text-gray-500 font-mono ml-1">µg/m³</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeedbackLoop;
