import { useState, useEffect } from 'react'

export default function NotificationBell() {
  const [permission, setPermission] = useState(
    Notification.permission
  )
  const [aqi, setAqi] = useState(null)

  useEffect(() => {
    registerServiceWorker()
    checkAQIAndNotify()
    const interval = setInterval(checkAQIAndNotify, 300000)
    return () => clearInterval(interval)
  }, [])

  async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js')
    }
  }

  async function requestPermission() {
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      new Notification('AirSense Delhi', {
        body: 'You will now receive AQI alerts for Delhi NCR',
        icon: '/favicon.ico'
      })
    }
  }

  async function checkAQIAndNotify() {
    try {
      const res = await fetch(
        'https://new-wrm-1.onrender.com/api/current-aqi'
      )
      const data = await res.json()
      const aqiValue = data.aqi_value
      setAqi(aqiValue)

      if (permission === 'granted') {
        if (aqiValue > 300) {
          sendNotification(
            '🚨 Hazardous Air Alert - Delhi NCR',
            `AQI is ${aqiValue}. Stay indoors. Avoid all outdoor activity.`
          )
        } else if (aqiValue > 200) {
          sendNotification(
            '⚠️ Very Unhealthy Air - Delhi NCR',
            `AQI is ${aqiValue}. Wear N95 mask if going outside.`
          )
        } else if (aqiValue > 150) {
          sendNotification(
            '😷 Unhealthy Air - Delhi NCR',
            `AQI is ${aqiValue}. Sensitive groups should stay indoors.`
          )
        }
      }
    } catch (err) {
      console.log('AQI check failed:', err)
    }
  }

  function sendNotification(title, body) {
    if (permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        requireInteraction: true
      })
    }
  }

  return (
    <div className="flex items-center gap-2">
      {permission === 'granted' ? (
        <div className="flex items-center gap-2 bg-green-900 px-3 py-1 rounded-full border border-green-700">
          <span className="text-green-400 text-sm">
            🔔 Alerts ON
          </span>
          {aqi && (
            <span className="text-white text-sm font-bold">
              AQI: {aqi}
            </span>
          )}
        </div>
      ) : (
        <button
          onClick={requestPermission}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-full text-white text-sm cursor-pointer animate-pulse border border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
        >
          🔔 Enable AQI Alerts
        </button>
      )}
    </div>
  )
}
