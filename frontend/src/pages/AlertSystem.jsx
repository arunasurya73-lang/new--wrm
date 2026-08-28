import React, { useState } from 'react';
import { ShieldAlert, Send, Clock, Users, MapPin, Activity, CheckCircle2, AlertTriangle, Flame, Snowflake, Loader2 } from 'lucide-react';

export default function AlertSystem() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [alertType, setAlertType] = useState('Moderate Warning');
  const [districts, setDistricts] = useState(['All Delhi NCR']);
  const [message, setMessage] = useState('AQI rising. Sensitive groups advised to limit outdoor exposure.');

  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'Hazardous Emergency',
      district: 'Anand Vihar',
      message: 'AQI crossed 350. Immediate indoor shelter advised.',
      time: '15 minutes ago',
      status: 'Delivered'
    },
    {
      id: 2,
      type: 'Stubble Burn Incoming',
      district: 'All Delhi NCR',
      message: 'Smoke plume detected 180km northwest. Expected arrival 6 hours.',
      time: '1 hour ago',
      status: 'Delivered'
    },
    {
      id: 3,
      type: 'Very Unhealthy Alert',
      district: 'Rohini, Dwarka',
      message: 'PM2.5 levels critical. Schools advised to cancel outdoor activities.',
      time: '3 hours ago',
      status: 'Delivered'
    },
    {
      id: 4,
      type: 'Inversion Layer Detected',
      district: 'All Delhi NCR',
      message: 'Severe inversion layer at 220m. Pollution trapped. No relief expected until Saturday.',
      time: '5 hours ago',
      status: 'Delivered'
    },
    {
      id: 5,
      type: 'Moderate Warning',
      district: 'Noida, Faridabad',
      message: 'AQI rising. Sensitive groups advised to limit outdoor exposure.',
      time: '8 hours ago',
      status: 'Delivered'
    }
  ]);

  const alertTypes = [
    { name: 'Moderate Warning', icon: '🟡', defaultMsg: 'AQI rising. Sensitive groups advised to limit outdoor exposure.' },
    { name: 'Unhealthy Alert', icon: '🟠', defaultMsg: 'AQI is unhealthy. Avoid prolonged outdoor exertion.' },
    { name: 'Very Unhealthy Alert', icon: '🔴', defaultMsg: 'PM2.5 levels critical. Schools advised to cancel outdoor activities.' },
    { name: 'Hazardous Emergency', icon: '🚨', defaultMsg: 'AQI crossed 350. Immediate indoor shelter advised.' },
    { name: 'Stubble Burn Incoming', icon: '🌫️', defaultMsg: 'Smoke plume detected. Expected arrival in a few hours.' },
    { name: 'Severe Inversion Layer Detected', icon: '❄️', defaultMsg: 'Severe inversion layer detected. Pollution trapped. No relief expected.' }
  ];

  const availableDistricts = [
    'All Delhi NCR', 'Rohini', 'Connaught Place', 'Noida',
    'Gurgaon', 'Faridabad', 'Dwarka', 'Anand Vihar'
  ];

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setAlertType(type);
    const selected = alertTypes.find(t => t.name === type);
    if (selected) {
      setMessage(selected.defaultMsg);
    }
  };

  const handleDistrictChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setDistricts(selected.length > 0 ? selected : ['All Delhi NCR']);
  };

  const sendAlert = () => {
    setLoading(true);
    
    setTimeout(() => {
      // Send real browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`AirSense: ${alertType}`, {
          body: message,
          icon: '/favicon.ico',
          tag: 'aqi-alert'
        });
      }

      const newAlert = {
        id: Date.now(),
        type: alertType,
        district: districts.join(', '),
        message: message,
        time: 'Just now',
        status: 'Delivered'
      };

      setAlerts([newAlert, ...alerts]);
      setLoading(false);
      
      setToast(`Alert sent successfully to ${districts.join(', ')}`);
      setTimeout(() => setToast(null), 3000);
    }, 1500);
  };

  const getTypeColor = (type) => {
    if (type.includes('Moderate')) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    if (type.includes('Very Unhealthy')) return 'bg-red-500/20 text-red-500 border-red-500/30';
    if (type.includes('Unhealthy')) return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    if (type.includes('Hazardous')) return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
    if (type.includes('Stubble')) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    if (type.includes('Inversion')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-900 border border-green-500 text-green-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slideUp">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          <span className="font-medium">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-800 pb-5">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-blue-500" />
          Emergency Alert System
        </h1>
        <p className="mt-2 text-textSecondary text-lg">
          Simulate and test AQI emergency alerts for Delhi NCR districts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-cardBg border border-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-500" />
              Alert Control Panel
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Select Alert Type</label>
                <select 
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={alertType}
                  onChange={handleTypeChange}
                >
                  {alertTypes.map(type => (
                    <option key={type.name} value={type.name}>
                      {type.icon} {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Select Target District</label>
                <select 
                  multiple
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none h-32"
                  value={districts}
                  onChange={handleDistrictChange}
                >
                  {availableDistricts.map(district => (
                    <option key={district} value={district} className="py-1">{district}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">Hold Ctrl/Cmd to select multiple districts</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Alert Message</label>
                <textarea 
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none h-24 resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <button
                onClick={sendAlert}
                disabled={loading || !message.trim()}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Sending Alert...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-6 w-6" />
                    Send Alert Now
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                This will send a browser notification to all subscribed users
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Feed & Stats */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-cardBg border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <Activity className="h-6 w-6 text-blue-500 mb-2" />
              <div className="text-2xl font-bold text-white">47</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Alerts Sent Today</div>
            </div>
            <div className="bg-cardBg border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <MapPin className="h-6 w-6 text-purple-500 mb-2" />
              <div className="text-2xl font-bold text-white">7</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Districts Covered</div>
            </div>
            <div className="bg-cardBg border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <Users className="h-6 w-6 text-green-500 mb-2" />
              <div className="text-2xl font-bold text-white">1,243</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Active Subscribers</div>
            </div>
            <div className="bg-cardBg border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <Clock className="h-6 w-6 text-orange-500 mb-2" />
              <div className="text-2xl font-bold text-white">2.3s</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Avg Response Time</div>
            </div>
          </div>

          {/* Feed */}
          <div className="bg-cardBg border border-gray-800 rounded-xl p-6 shadow-xl h-[600px] flex flex-col">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Recent Alerts Sent
            </h2>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTypeColor(alert.type)}`}>
                      {alert.type}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {alert.time}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <h3 className="text-white font-medium text-sm flex items-center gap-1 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {alert.district}
                    </h3>
                    <p className="text-gray-400 text-sm">{alert.message}</p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium bg-green-900/20 w-fit px-2 py-1 rounded">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {alert.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
