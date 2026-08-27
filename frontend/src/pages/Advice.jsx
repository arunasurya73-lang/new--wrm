import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Briefcase, GraduationCap, HeartPulse, Sprout, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

function Advice() {
  const [loading, setLoading] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState('worker');
  const [adviceData, setAdviceData] = useState(null);
  const [error, setError] = useState(null);

  const fetchAdvice = async (type) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/advice/${type}`);
      setAdviceData(res.data);
    } catch (err) {
      console.error(`Error loading advice for ${type}:`, err);
      setError("Failed to load targeted health advice recommendations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvice(selectedUserType);
  }, [selectedUserType]);

  const cards = [
    { id: 'worker', label: 'Worker / Commuter', icon: Briefcase, description: 'Advice for outdoor laborers, traffic wardens, and daily office commuters.' },
    { id: 'parent', label: 'Parent / School', icon: GraduationCap, description: 'Recess guidelines, PE limitations, and recommendations for school closures.' },
    { id: 'hospital', label: 'Hospital / Clinic', icon: HeartPulse, description: 'Patient surge prediction metrics and critical respiratory ward alerts.' },
    { id: 'farmer', label: 'Farmer / Burn Timing', icon: Sprout, description: 'Wind pattern analysis and atmospheric safe windows for field clearance.' },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">What Should You Do Today?</h1>
        <p className="text-xs text-textSecondary mt-1">Select your profile to receive targeted, data-driven health and action recommendations</p>
      </div>

      {/* Grid of Selectable Profile Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const isSelected = selectedUserType === card.id;
          return (
            <button
              key={card.id}
              onClick={() => setSelectedUserType(card.id)}
              className={`p-5 rounded-card text-left transition-all flex flex-col justify-between border cursor-pointer h-[150px] shadow-cardShadow ${
                isSelected
                  ? 'bg-blue-600/10 border-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  : 'bg-cardBg border-gray-850 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-900 text-textSecondary'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                {isSelected && <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping"></span>}
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-white">{card.label}</h3>
                <p className="text-[10px] text-textSecondary mt-1 leading-normal line-clamp-2">
                  {card.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Advice Display Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-cardBg border border-gray-800 rounded-card min-h-[300px]">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-xs font-mono mt-3 text-textSecondary">Consulting medical and wind databases...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-12 bg-cardBg border border-gray-800 rounded-card min-h-[300px] text-dangerColor text-xs">
          <AlertTriangle className="h-8 w-8 text-dangerColor mb-3" />
          <span>{error}</span>
        </div>
      ) : adviceData ? (
        <div className="bg-cardBg border border-gray-850 rounded-card shadow-cardShadow overflow-hidden">
          {/* Header Banner */}
          <div className="px-5 py-4 border-b border-gray-800 bg-[#12192c] flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Advisory Response Protocol
            </h3>
            <span className="text-[10px] text-gray-500 font-mono mt-1 sm:mt-0">
              Triggered at current AQI: <strong className="text-white">{adviceData.aqi_level}</strong>
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Bold Action Sentence */}
            <div className="bg-blue-600/5 border border-blue-600/20 p-5 rounded-lg">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block mb-1">Recommended Action</span>
              <p className="text-base font-extrabold text-white leading-relaxed">
                "{adviceData.action_sentence}"
              </p>
            </div>

            {/* Why Section */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-textSecondary block mb-1.5">Medical & Scientific Rationale</span>
              <p className="text-sm text-textSecondary leading-relaxed bg-[#0c1222] border border-gray-850 p-4 rounded-lg">
                {adviceData.why_section}
              </p>
            </div>

            {/* 24-Hour Mini Forecast Chart */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-textSecondary block mb-3">Local Exposure Forecast (Next 24 Hours)</span>
              <div className="w-full h-[150px] font-mono text-[9px] bg-[#0c1222] border border-gray-850 p-4 rounded-lg">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={adviceData.mini_forecast}>
                    <defs>
                      <linearGradient id="miniAqi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#4b5563"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#4b5563" 
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', color: '#fff', fontSize: 10 }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="predicted_aqi" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#miniAqi)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Advice;
