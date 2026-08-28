import { useState } from 'react'

const ALERT_TYPES = [
  {
    id: 'hazardous',
    label: '🚨 Hazardous Emergency',
    color: '#7F1D1D',
    badge: 'bg-red-900 text-red-300',
    defaultMessage: 'AQI has crossed 350 in your area. This is a health emergency. Stay indoors immediately. Close all windows and doors.',
    aqi: '350+'
  },
  {
    id: 'very-unhealthy',
    label: '🔴 Very Unhealthy Alert',
    color: '#991B1B',
    badge: 'bg-red-800 text-red-200',
    defaultMessage: 'AQI has crossed 250. Very unhealthy air quality detected. Avoid all outdoor activity. Schools advised to cancel outdoor sessions.',
    aqi: '250+'
  },
  {
    id: 'unhealthy',
    label: '🟠 Unhealthy Warning',
    color: '#92400E',
    badge: 'bg-orange-900 text-orange-300',
    defaultMessage: 'AQI has crossed 180. Unhealthy air quality. Wear N95 mask if going outside. Sensitive groups should stay indoors.',
    aqi: '180+'
  },
  {
    id: 'stubble',
    label: '🌫️ Stubble Burn Incoming',
    color: '#78350F',
    badge: 'bg-yellow-900 text-yellow-300',
    defaultMessage: 'Satellite detected 47 active fires in Punjab. Smoke plume moving toward Delhi. Expected arrival in 8 hours. Prepare for AQI spike.',
    aqi: 'Fire Alert'
  },
  {
    id: 'inversion',
    label: '❄️ Severe Inversion Layer',
    color: '#1E3A5F',
    badge: 'bg-blue-900 text-blue-300',
    defaultMessage: 'Severe inversion layer detected at 200 metres. Pollution trapped near ground. No wind relief expected for 24 hours. AQI will rise significantly.',
    aqi: 'Inversion'
  },
  {
    id: 'moderate',
    label: '🟡 Moderate Advisory',
    color: '#713F12',
    badge: 'bg-yellow-800 text-yellow-200',
    defaultMessage: 'AQI is rising in your area. Sensitive groups including children and elderly should limit outdoor exposure.',
    aqi: '120+'
  }
]

const DISTRICTS = [
  'All Delhi NCR',
  'Rohini',
  'Connaught Place',
  'Noida',
  'Gurgaon',
  'Faridabad',
  'Dwarka',
  'Anand Vihar'
]

const INITIAL_ALERTS = [
  {
    id: 1,
    type: ALERT_TYPES[0],
    district: 'Anand Vihar',
    message: 'AQI crossed 350. Immediate indoor shelter advised. All outdoor activities suspended.',
    time: '15 minutes ago',
    status: 'Delivered',
    recipients: 12847
  },
  {
    id: 2,
    type: ALERT_TYPES[3],
    district: 'All Delhi NCR',
    message: 'Smoke plume detected 180km northwest. Expected arrival in 6 hours. Prepare for hazardous conditions.',
    time: '1 hour ago',
    status: 'Delivered',
    recipients: 89234
  },
  {
    id: 3,
    type: ALERT_TYPES[1],
    district: 'Rohini, Dwarka',
    message: 'PM2.5 levels critical at 187 μg/m³. Schools advised to cancel all outdoor activities immediately.',
    time: '3 hours ago',
    status: 'Delivered',
    recipients: 34521
  },
  {
    id: 4,
    type: ALERT_TYPES[4],
    district: 'All Delhi NCR',
    message: 'Severe inversion layer at 220m. Pollution trapped. No relief expected until Saturday afternoon.',
    time: '5 hours ago',
    status: 'Delivered',
    recipients: 89234
  },
  {
    id: 5,
    type: ALERT_TYPES[2],
    district: 'Noida, Faridabad',
    message: 'AQI rising steadily. Sensitive groups advised to limit outdoor exposure to under 30 minutes.',
    time: '8 hours ago',
    status: 'Delivered',
    recipients: 28943
  }
]

export default function AlertSystem() {
  const [selectedType, setSelectedType] = useState(ALERT_TYPES[0])
  const [selectedDistrict, setSelectedDistrict] = useState('All Delhi NCR')
  const [message, setMessage] = useState(ALERT_TYPES[0].defaultMessage)
  const [alerts, setAlerts] = useState(INITIAL_ALERTS)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState(null)
  const [totalSent, setTotalSent] = useState(47)

  function handleTypeChange(typeId) {
    const type = ALERT_TYPES.find(t => t.id === typeId)
    setSelectedType(type)
    setMessage(type.defaultMessage)
  }

  async function sendAlert() {
    if (sending) return
    setSending(true)

    await new Promise(r => setTimeout(r, 1500))

    if (Notification.permission === 'granted') {
      new Notification(selectedType.label + ' - Delhi NCR', {
        body: message,
        icon: '/favicon.ico',
        requireInteraction: true,
        badge: '/favicon.ico'
      })
    } else if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        new Notification(selectedType.label + ' - Delhi NCR', {
          body: message,
          icon: '/favicon.ico',
          requireInteraction: true
        })
      }
    }

    const recipients = selectedDistrict === 'All Delhi NCR' 
      ? 89234 
      : Math.floor(Math.random() * 30000) + 5000

    const newAlert = {
      id: Date.now(),
      type: selectedType,
      district: selectedDistrict,
      message: message,
      time: 'Just now',
      status: 'Delivered',
      recipients: recipients
    }

    setAlerts(prev => [newAlert, ...prev])
    setTotalSent(prev => prev + 1)
    setSending(false)

    setToast(`Alert sent to ${selectedDistrict}!`)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="min-h-screen p-6"
      style={{backgroundColor: '#0A0F1E'}}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50
          bg-green-600 text-white px-6 py-3 
          rounded-xl shadow-lg font-semibold
          animate-bounce">
          ✅ {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          🚨 Emergency Alert System
        </h1>
        <p className="text-gray-400">
          Send real-time AQI emergency notifications 
          to Delhi NCR residents
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 
        gap-4 mb-8">
        {[
          { label: 'Alerts Sent Today', value: totalSent, icon: '📤' },
          { label: 'Districts Covered', value: '7', icon: '🗺️' },
          { label: 'Active Subscribers', value: '1,243', icon: '👥' },
          { label: 'Avg Response Time', value: '2.3s', icon: '⚡' }
        ].map(stat => (
          <div key={stat.label}
            className="rounded-2xl p-4 text-center"
            style={{backgroundColor: '#111827'}}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-white">
              {stat.value}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Control Panel */}
        <div className="rounded-2xl p-6"
          style={{backgroundColor: '#111827'}}>
          <h2 className="text-xl font-bold text-white mb-6">
            📡 Alert Control Panel
          </h2>

          {/* Alert Type */}
          <div className="mb-5">
            <label className="text-gray-400 text-sm 
              font-medium block mb-2">
              Alert Type
            </label>
            <select
              value={selectedType.id}
              onChange={e => handleTypeChange(e.target.value)}
              className="w-full bg-gray-800 text-white 
                border border-gray-600 rounded-xl 
                px-4 py-3 text-sm
                focus:outline-none focus:border-blue-500">
              {ALERT_TYPES.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div className="mb-5">
            <label className="text-gray-400 text-sm 
              font-medium block mb-2">
              Target District
            </label>
            <select
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              className="w-full bg-gray-800 text-white 
                border border-gray-600 rounded-xl 
                px-4 py-3 text-sm
                focus:outline-none focus:border-blue-500">
              {DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div className="mb-6">
            <label className="text-gray-400 text-sm 
              font-medium block mb-2">
              Alert Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 text-white 
                border border-gray-600 rounded-xl 
                px-4 py-3 text-sm resize-none
                focus:outline-none focus:border-blue-500
                placeholder-gray-500"/>
          </div>

          {/* Preview box */}
          <div className="mb-6 rounded-xl p-4 border
            border-gray-600 bg-gray-800">
            <p className="text-gray-400 text-xs mb-2">
              NOTIFICATION PREVIEW
            </p>
            <p className="text-white text-sm font-bold">
              {selectedType.label} — {selectedDistrict}
            </p>
            <p className="text-gray-300 text-xs mt-1">
              {message.slice(0, 80)}...
            </p>
          </div>

          {/* Send button */}
          <button
            onClick={sendAlert}
            disabled={sending}
            className="w-full py-4 rounded-xl font-bold
              text-white text-lg
              transition-all duration-200
              flex items-center justify-center gap-3"
            style={{
              backgroundColor: sending 
                ? '#374151' 
                : '#DC2626'
            }}>
            {sending ? (
              <>
                <div className="w-5 h-5 border-2 
                  border-white border-t-transparent 
                  rounded-full animate-spin"/>
                Sending Alert...
              </>
            ) : (
              <>
                🚨 Launch Alert Now
              </>
            )}
          </button>
          <p className="text-gray-500 text-xs 
            text-center mt-3">
            This will send a real browser notification 
            to all subscribed users
          </p>
        </div>

        {/* Alert Feed */}
        <div className="rounded-2xl p-6"
          style={{backgroundColor: '#111827'}}>
          <h2 className="text-xl font-bold text-white mb-6">
            📋 Live Alert Feed
          </h2>
          <div className="space-y-4 max-h-96 
            overflow-y-auto pr-1">
            {alerts.map(alert => (
              <div key={alert.id}
                className="rounded-xl p-4 border
                  border-gray-700 bg-gray-800">
                <div className="flex items-center 
                  justify-between mb-2">
                  <span className={`text-xs font-bold 
                    px-2 py-1 rounded-full 
                    ${alert.type.badge}`}>
                    {alert.type.label}
                  </span>
                  <span className="text-green-400 
                    text-xs font-medium">
                    ✓ {alert.status}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  {alert.message.slice(0, 90)}...
                </p>
                <div className="flex justify-between 
                  items-center">
                  <div>
                    <span className="text-blue-400 
                      text-xs">
                      📍 {alert.district}
                    </span>
                    <span className="text-gray-500 
                      text-xs ml-3">
                      👥 {alert.recipients.toLocaleString()} 
                      notified
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {alert.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
