import { useState, useRef, useEffect } from 'react'
import api from '../api/client'

const SYSTEM_PROMPT = `You are AirBot, an AI assistant 
for AirSense Delhi — an air quality monitoring system 
for Delhi NCR, India.

You help people understand:
- Current AQI levels and what they mean
- PM2.5, PM10, Ozone, NO2 pollution
- Stubble burning and its effects on Delhi
- Inversion layers and why pollution gets trapped
- Safe times to go outside
- What mask to wear
- Advice for workers, parents, hospitals, farmers
- Weather conditions in Delhi NCR

Current live data will be passed to you with 
each message so give specific accurate answers.

Keep answers short, clear, and in simple English.
No technical jargon. Talk like a helpful friend.
Maximum 3 sentences per answer.
Use emojis to make it friendly.`

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I am AirBot. Ask me anything about Delhi air quality, pollution, or weather!'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [liveData, setLiveData] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchLiveData()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth' 
    })
  }, [messages])

  async function fetchLiveData() {
    try {
      const [aqi, weather] = await Promise.all([
        api.get('/api/current-aqi'),
        api.get('/api/weather')
      ])
      setLiveData({
        aqi: aqi.data.aqi_value,
        pm25: aqi.data.pm25,
        pm10: aqi.data.pm10,
        label: aqi.data.label,
        temperature: weather.data.temperature,
        windSpeed: weather.data.wind_speed,
        inversionStrength: weather.data.inversion_strength
      })
    } catch (err) {
      console.log('Could not fetch live data for chatbot')
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage
    }])
    setLoading(true)

    const liveContext = liveData ? `
Current Delhi live data:
AQI: ${liveData.aqi} (${liveData.label})
PM2.5: ${liveData.pm25}
Temperature: ${liveData.temperature}°C
Wind Speed: ${liveData.windSpeed} km/h
` : 'Live data unavailable.'

    try {
      const groqKey = import.meta.env.VITE_GROQ_API_KEY

      const res = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + groqKey
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            max_tokens: 200,
            messages: [
              {
                role: 'system',
                content: 'You are AirBot, a helpful assistant for Delhi NCR air quality. Answer in 2 short sentences. Use emojis. Current AQI is ' + (liveData ? liveData.aqi : 'unknown') + '.'
              },
              {
                role: 'user',
                content: userMessage
              }
            ]
          })
        }
      )

      const text = await res.text()
      console.log('Raw response:', text)
      const data = JSON.parse(text)

      if (data.choices && data.choices[0]) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.choices[0].message.content
        }])
      } else if (data.error) {
        throw new Error(data.error.message)
      } else {
        throw new Error('Unexpected response: ' + text)
      }

    } catch (err) {
      console.error('Full error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error: ' + err.message
      }])
    }

    setLoading(false)
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-full
          bg-blue-600 hover:bg-blue-500
          flex items-center justify-center
          shadow-lg shadow-blue-900
          transition-all duration-300"
      >
        {open ? (
          <span className="text-white text-xl">✕</span>
        ) : (
          <span className="text-2xl">🤖</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50
          w-80 h-96 rounded-2xl
          bg-gray-900 border border-gray-700
          flex flex-col shadow-2xl
          shadow-black/50">

          {/* Header */}
          <div className="bg-blue-700 rounded-t-2xl 
            px-4 py-3 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="text-white font-bold 
                text-sm">AirBot</p>
              <p className="text-blue-200 text-xs">
                Delhi AQI Assistant
              </p>
            </div>
            {liveData && (
              <div className="ml-auto bg-blue-800 
                px-2 py-1 rounded-full">
                <span className="text-white text-xs font-bold">
                  AQI {liveData.aqi}
                </span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto 
            p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${
                msg.role === 'user' 
                  ? 'justify-end' 
                  : 'justify-start'
              }`}>
                <div className={`max-w-xs px-3 py-2 
                  rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-700 text-gray-100 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 px-4 py-2 
                  rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 
                      rounded-full animate-bounce"
                      style={{animationDelay:'0ms'}}/>
                    <span className="w-2 h-2 bg-gray-400 
                      rounded-full animate-bounce"
                      style={{animationDelay:'150ms'}}/>
                    <span className="w-2 h-2 bg-gray-400 
                      rounded-full animate-bounce"
                      style={{animationDelay:'300ms'}}/>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          <div className="px-3 pb-2 flex gap-1 
            overflow-x-auto">
            {[
              'Is air safe today?',
              'Should I wear mask?',
              'Best time outside?',
              'Why is AQI high?'
            ].map(q => (
              <button
                key={q}
                onClick={() => {
                  setInput(q)
                  setTimeout(sendMessage, 100)
                }}
                className="text-xs bg-gray-700 
                  hover:bg-gray-600 text-gray-300
                  px-2 py-1 rounded-full 
                  whitespace-nowrap flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 pt-0 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about Delhi air..."
              className="flex-1 bg-gray-700 text-white
                placeholder-gray-400 text-sm
                px-3 py-2 rounded-xl
                border border-gray-600
                focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500
                disabled:bg-gray-600
                w-9 h-9 rounded-xl
                flex items-center justify-center
                flex-shrink-0"
            >
              <span className="text-white text-sm">→</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
