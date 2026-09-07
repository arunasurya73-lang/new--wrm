// Weather Service: Open-Meteo Live Integration & Reactive Theme State Mapping
// Fetches live real-time weather conditions for any station/location coordinates

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 Minutes Cache
const memoryWeatherCache = new Map();

/**
 * Weather state definitions:
 * - 'clear': Bright white-blue background, full brightness (cloud_cover < 30% or clear sky)
 * - 'moderate-cloudy': Desaturated background, soft grey-white gradient, diffused overcast lighting (30-70% clouds)
 * - 'overcast': Deeper grey background tint, muted accents (>70% clouds, fog)
 * - 'rain': Subtle cool-blue tint to background (rain, drizzle, showers, thunderstorms)
 * - 'night': Dimmed Clean Light palette rather than full dark mode (is_day = 0)
 */

export async function fetchLiveWeather(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return getDefaultWeather();
  }

  const cacheKey = `airsense_weather_${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const now = Date.now();

  // Check in-memory cache
  if (memoryWeatherCache.has(cacheKey)) {
    const cached = memoryWeatherCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_DURATION_MS) {
      return cached.data;
    }
  }

  // Check localStorage cache
  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (now - parsed.timestamp < CACHE_DURATION_MS) {
        memoryWeatherCache.set(cacheKey, parsed);
        return parsed.data;
      }
    }
  } catch (e) {
    // localStorage parsing error fallback
  }

  // Fetch live from Open-Meteo free API
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=weather_code,cloud_cover,is_day`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json && json.current) {
        const weatherData = {
          weather_code: json.current.weather_code,
          cloud_cover: json.current.cloud_cover,
          is_day: json.current.is_day,
          time: json.current.time
        };

        const cacheEntry = { timestamp: now, data: weatherData };
        memoryWeatherCache.set(cacheKey, cacheEntry);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
        } catch (err) {
          // ignore quota limits
        }

        return weatherData;
      }
    }
  } catch (err) {
    console.warn('Open-Meteo weather fetch fallback:', err.message);
  }

  return getDefaultWeather();
}

function getDefaultWeather() {
  return {
    weather_code: 2,
    cloud_cover: 50,
    is_day: 1
  };
}

/**
 * Maps Open-Meteo weather_code / cloud_cover / is_day to Clean Light weather states
 */
export function mapWeatherToVisualState(weather) {
  if (!weather) return 'moderate-cloudy';

  const { weather_code = 0, cloud_cover = 50, is_day = 1 } = weather;

  // 1. Night Condition (is_day === 0)
  if (is_day === 0) {
    return 'night';
  }

  // 2. Rain & Precipitation Codes (WMO Codes)
  // 51,53,55: Drizzle; 56,57: Freezing Drizzle; 61,63,65: Rain; 66,67: Freezing Rain; 80,81,82: Rain showers; 95,96,99: Thunderstorms
  const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
  if (rainCodes.includes(weather_code)) {
    return 'rain';
  }

  // 3. Overcast / Heavy Cloud (> 70% or WMO code 3: Overcast, 45/48: Fog, 71/73/75/77/85/86: Snow)
  const heavyCloudCodes = [3, 45, 48, 71, 73, 75, 77, 85, 86];
  if (cloud_cover > 70 || heavyCloudCodes.includes(weather_code)) {
    return 'overcast';
  }

  // 4. Moderate Cloudy (Cloud cover 30% - 70% or WMO code 1: Mainly clear, 2: Partly cloudy)
  if ((cloud_cover >= 30 && cloud_cover <= 70) || weather_code === 1 || weather_code === 2) {
    return 'moderate-cloudy';
  }

  // 5. Clear / Sunny (Cloud cover < 30% and code 0)
  if (cloud_cover < 30 || weather_code === 0) {
    return 'clear';
  }

  return 'moderate-cloudy';
}

/**
 * Human-readable metadata for weather-reactive badge/tooltip
 */
export function getWeatherStateMetadata(state, weatherData = {}) {
  const cloud = weatherData.cloud_cover !== undefined ? `${weatherData.cloud_cover}% clouds` : '';
  
  switch (state) {
    case 'clear':
      return {
        state: 'clear',
        label: 'Clear Sky',
        icon: '☀️',
        description: `Sunny & clear conditions${cloud ? ` (${cloud})` : ''} • Full bright ambiance`
      };
    case 'moderate-cloudy':
      return {
        state: 'moderate-cloudy',
        label: 'Moderate Cloudy',
        icon: '⛅',
        description: `Partly cloudy skies${cloud ? ` (${cloud})` : ''} • Soft diffused overcast lighting`
      };
    case 'overcast':
      return {
        state: 'overcast',
        label: 'Overcast',
        icon: '☁️',
        description: `Dense cloud cover${cloud ? ` (${cloud})` : ''} • Muted slate tone`
      };
    case 'rain':
      return {
        state: 'rain',
        label: 'Rain / Precipitation',
        icon: '🌧️',
        description: `Precipitation active • Subtle cool-blue rain wash`
      };
    case 'night':
      return {
        state: 'night',
        label: 'Night Ambient',
        icon: '🌙',
        description: `Nighttime lighting • Soft twilight silver palette`
      };
    default:
      return {
        state: 'moderate-cloudy',
        label: 'Moderate Cloudy',
        icon: '⛅',
        description: 'Soft diffused lighting'
      };
  }
}
