// Delhi NCR Comprehensive Monitoring Stations (20 Stations) & AQI System
export const AQI_LEVELS = [
  { min: 0, max: 50, label: 'Good', color: '#10B981', bgGlow: 'rgba(16, 185, 129, 0.2)', textColor: '#10B981', desc: 'Air quality is satisfactory, poses little or no risk.' },
  { min: 51, max: 100, label: 'Moderate', color: '#84CC16', bgGlow: 'rgba(132, 204, 22, 0.2)', textColor: '#84CC16', desc: 'Air quality is acceptable; slight concern for very sensitive individuals.' },
  { min: 101, max: 200, label: 'Poor', color: '#F59E0B', bgGlow: 'rgba(245, 158, 11, 0.2)', textColor: '#F59E0B', desc: 'Breathing discomfort to people with lung, asthma and heart diseases.' },
  { min: 201, max: 300, label: 'Very Poor', color: '#F97316', bgGlow: 'rgba(249, 115, 22, 0.2)', textColor: '#F97316', desc: 'Breathing discomfort to most people on prolonged exposure.' },
  { min: 301, max: 400, label: 'Severe', color: '#EF4444', bgGlow: 'rgba(239, 68, 68, 0.25)', textColor: '#EF4444', desc: 'Respiratory effects even on healthy people; serious impact on sensitive groups.' },
  { min: 401, max: 500, label: 'Hazardous', color: '#A855F7', bgGlow: 'rgba(168, 85, 247, 0.3)', textColor: '#A855F7', desc: 'Health warning of emergency conditions. Entire population likely to be affected.' }
];

export function getAQIInfo(aqi) {
  for (const level of AQI_LEVELS) {
    if (aqi <= level.max) return level;
  }
  return { min: 501, max: 999, label: 'Severe+', color: '#7E22CE', bgGlow: 'rgba(126, 34, 206, 0.35)', textColor: '#9333EA', desc: 'Extreme emergency conditions. Avoid all outdoor activities.' };
}

export const STATIONS = [
  {
    id: 'anand-vihar',
    name: 'Anand Vihar, East Delhi',
    lat: 28.6469,
    lng: 77.3160,
    aqi: 382,
    pm25: 295,
    pm10: 412,
    no2: 68,
    so2: 18,
    co: 2.8,
    o3: 24,
    stubbleShare: 32,
    wind: { speed: 6.2, direction: 'NW (315°)', deg: 315 },
    temp: 24.5,
    humidity: 68,
    visibility: 1.2
  },
  {
    id: 'bawana',
    name: 'Bawana Industrial Area',
    lat: 28.7762,
    lng: 77.0510,
    aqi: 415,
    pm25: 320,
    pm10: 448,
    no2: 82,
    so2: 24,
    co: 3.4,
    o3: 18,
    stubbleShare: 38,
    wind: { speed: 6.0, direction: 'NNW (330°)', deg: 330 },
    temp: 23.8,
    humidity: 71,
    visibility: 0.9
  },
  {
    id: 'mundka',
    name: 'Mundka, West Delhi',
    lat: 28.6840,
    lng: 77.0315,
    aqi: 396,
    pm25: 305,
    pm10: 430,
    no2: 76,
    so2: 20,
    co: 3.0,
    o3: 21,
    stubbleShare: 36,
    wind: { speed: 6.4, direction: 'NW (315°)', deg: 315 },
    temp: 24.1,
    humidity: 69,
    visibility: 1.0
  },
  {
    id: 'jahangirpuri',
    name: 'Jahangirpuri, North Delhi',
    lat: 28.7328,
    lng: 77.1706,
    aqi: 388,
    pm25: 298,
    pm10: 422,
    no2: 70,
    so2: 19,
    co: 2.9,
    o3: 20,
    stubbleShare: 34,
    wind: { speed: 6.6, direction: 'NNW (325°)', deg: 325 },
    temp: 24.3,
    humidity: 67,
    visibility: 1.1
  },
  {
    id: 'wazirpur',
    name: 'Wazirpur Industrial Area',
    lat: 28.6998,
    lng: 77.1652,
    aqi: 392,
    pm25: 302,
    pm10: 428,
    no2: 78,
    so2: 22,
    co: 3.2,
    o3: 19,
    stubbleShare: 33,
    wind: { speed: 6.2, direction: 'NW (320°)', deg: 320 },
    temp: 24.4,
    humidity: 66,
    visibility: 1.1
  },
  {
    id: 'ito',
    name: 'ITO / Central Delhi',
    lat: 28.6289,
    lng: 77.2405,
    aqi: 324,
    pm25: 240,
    pm10: 360,
    no2: 74,
    so2: 21,
    co: 3.1,
    o3: 30,
    stubbleShare: 28,
    wind: { speed: 5.8, direction: 'NW (310°)', deg: 310 },
    temp: 25.1,
    humidity: 64,
    visibility: 1.5
  },
  {
    id: 'rk-puram',
    name: 'R.K. Puram, South Delhi',
    lat: 28.5660,
    lng: 77.1767,
    aqi: 295,
    pm25: 210,
    pm10: 310,
    no2: 52,
    so2: 14,
    co: 1.9,
    o3: 28,
    stubbleShare: 24,
    wind: { speed: 6.5, direction: 'WNW (295°)', deg: 295 },
    temp: 25.4,
    humidity: 62,
    visibility: 1.8
  },
  {
    id: 'punjabi-bagh',
    name: 'Punjabi Bagh, West Delhi',
    lat: 28.6692,
    lng: 77.1264,
    aqi: 348,
    pm25: 265,
    pm10: 388,
    no2: 63,
    so2: 16,
    co: 2.4,
    o3: 22,
    stubbleShare: 30,
    wind: { speed: 7.1, direction: 'NW (320°)', deg: 320 },
    temp: 24.8,
    humidity: 65,
    visibility: 1.3
  },
  {
    id: 'dwarka-sec8',
    name: 'Dwarka Sector 8',
    lat: 28.5708,
    lng: 77.0710,
    aqi: 278,
    pm25: 195,
    pm10: 298,
    no2: 44,
    so2: 12,
    co: 1.6,
    o3: 35,
    stubbleShare: 22,
    wind: { speed: 8.0, direction: 'WNW (290°)', deg: 290 },
    temp: 25.8,
    humidity: 59,
    visibility: 2.1
  },
  {
    id: 'rohini',
    name: 'Rohini Sector 16',
    lat: 28.7325,
    lng: 77.1194,
    aqi: 365,
    pm25: 280,
    pm10: 405,
    no2: 59,
    so2: 19,
    co: 2.6,
    o3: 19,
    stubbleShare: 35,
    wind: { speed: 6.8, direction: 'NNW (330°)', deg: 330 },
    temp: 24.2,
    humidity: 67,
    visibility: 1.1
  },
  {
    id: 'lodhi-road',
    name: 'Lodhi Road (IMD)',
    lat: 28.5910,
    lng: 77.2270,
    aqi: 254,
    pm25: 178,
    pm10: 265,
    no2: 48,
    so2: 11,
    co: 1.4,
    o3: 31,
    stubbleShare: 20,
    wind: { speed: 5.5, direction: 'NW (315°)', deg: 315 },
    temp: 25.6,
    humidity: 61,
    visibility: 2.4
  },
  {
    id: 'okhla-phase2',
    name: 'Okhla Phase 2, South-East Delhi',
    lat: 28.5308,
    lng: 77.2713,
    aqi: 332,
    pm25: 245,
    pm10: 368,
    no2: 66,
    so2: 18,
    co: 2.5,
    o3: 25,
    stubbleShare: 25,
    wind: { speed: 5.7, direction: 'NW (310°)', deg: 310 },
    temp: 25.3,
    humidity: 63,
    visibility: 1.6
  },
  {
    id: 'nehru-nagar',
    name: 'Nehru Nagar / Lajpat Nagar',
    lat: 28.5679,
    lng: 77.2505,
    aqi: 318,
    pm25: 235,
    pm10: 352,
    no2: 62,
    so2: 15,
    co: 2.2,
    o3: 27,
    stubbleShare: 24,
    wind: { speed: 5.9, direction: 'NW (315°)', deg: 315 },
    temp: 25.2,
    humidity: 64,
    visibility: 1.7
  },
  {
    id: 'igi-airport',
    name: 'IGI Airport (T3)',
    lat: 28.5562,
    lng: 77.0999,
    aqi: 285,
    pm25: 205,
    pm10: 315,
    no2: 56,
    so2: 15,
    co: 2.1,
    o3: 29,
    stubbleShare: 23,
    wind: { speed: 8.4, direction: 'WNW (295°)', deg: 295 },
    temp: 26.0,
    humidity: 58,
    visibility: 1.9
  },
  {
    id: 'noida-sec62',
    name: 'Noida Sector 62',
    lat: 28.6256,
    lng: 77.3649,
    aqi: 338,
    pm25: 250,
    pm10: 375,
    no2: 61,
    so2: 17,
    co: 2.3,
    o3: 26,
    stubbleShare: 27,
    wind: { speed: 5.9, direction: 'NW (315°)', deg: 315 },
    temp: 25.0,
    humidity: 66,
    visibility: 1.4
  },
  {
    id: 'ghaziabad-vasundhara',
    name: 'Ghaziabad (Vasundhara)',
    lat: 28.6603,
    lng: 77.3789,
    aqi: 374,
    pm25: 288,
    pm10: 410,
    no2: 72,
    so2: 21,
    co: 2.9,
    o3: 22,
    stubbleShare: 31,
    wind: { speed: 5.6, direction: 'NW (310°)', deg: 310 },
    temp: 24.7,
    humidity: 67,
    visibility: 1.2
  },
  {
    id: 'gurugram-cyberhub',
    name: 'Gurugram Cyber Hub',
    lat: 28.4986,
    lng: 77.0878,
    aqi: 262,
    pm25: 182,
    pm10: 284,
    no2: 46,
    so2: 13,
    co: 1.7,
    o3: 33,
    stubbleShare: 21,
    wind: { speed: 7.6, direction: 'W (280°)', deg: 280 },
    temp: 26.2,
    humidity: 57,
    visibility: 2.2
  },
  {
    id: 'faridabad-sec16a',
    name: 'Faridabad Sector 16A',
    lat: 28.4089,
    lng: 77.3178,
    aqi: 298,
    pm25: 215,
    pm10: 325,
    no2: 54,
    so2: 16,
    co: 2.0,
    o3: 30,
    stubbleShare: 22,
    wind: { speed: 6.1, direction: 'WNW (290°)', deg: 290 },
    temp: 26.1,
    humidity: 60,
    visibility: 1.8
  },
  {
    id: 'greater-noida',
    name: 'Greater Noida (Knowledge Park III)',
    lat: 28.4682,
    lng: 77.4912,
    aqi: 312,
    pm25: 228,
    pm10: 345,
    no2: 58,
    so2: 16,
    co: 2.1,
    o3: 28,
    stubbleShare: 26,
    wind: { speed: 5.4, direction: 'NW (315°)', deg: 315 },
    temp: 25.1,
    humidity: 65,
    visibility: 1.7
  },
  {
    id: 'sonipat-border',
    name: 'Sonipat / NCR North Border',
    lat: 28.9931,
    lng: 77.0151,
    aqi: 378,
    pm25: 290,
    pm10: 418,
    no2: 67,
    so2: 20,
    co: 2.7,
    o3: 21,
    stubbleShare: 37,
    wind: { speed: 7.0, direction: 'NNW (330°)', deg: 330 },
    temp: 23.9,
    humidity: 70,
    visibility: 1.0
  }
];

export const STUBBLE_FIRE_HOTSPOTS = [
  { lat: 30.3400, lng: 76.3800, intensity: 'High (840 detections)', region: 'Patiala / Sangrur, Punjab' },
  { lat: 30.9000, lng: 75.8500, intensity: 'Severe (1,120 detections)', region: 'Ludhiana, Punjab' },
  { lat: 29.9600, lng: 76.8700, intensity: 'Moderate (420 detections)', region: 'Kurukshetra, Haryana' },
  { lat: 29.6800, lng: 76.9900, intensity: 'High (690 detections)', region: 'Karnal, Haryana' },
  { lat: 29.3900, lng: 76.9600, intensity: 'Moderate (350 detections)', region: 'Panipat, Haryana' },
  { lat: 31.1471, lng: 75.3412, intensity: 'High (760 detections)', region: 'Moga / Ferozepur, Punjab' },
  { lat: 30.1365, lng: 77.2982, intensity: 'Moderate (310 detections)', region: 'Yamunanagar, Haryana' }
];

export function generate24HourTrend(baseAqi) {
  const hours = [];
  const aqiData = [];
  const pm25Data = [];
  const stubbleData = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600 * 1000);
    const hourLabel = time.getHours().toString().padStart(2, '0') + ':00';
    hours.push(hourLabel);

    const hour = time.getHours();
    let diurnalFactor = 1.0;
    if (hour >= 6 && hour <= 9) diurnalFactor = 1.25;
    else if (hour >= 20 && hour <= 23) diurnalFactor = 1.2;
    else if (hour >= 13 && hour <= 16) diurnalFactor = 0.82;

    const val = Math.round(baseAqi * diurnalFactor + (Math.sin(i) * 12));
    aqiData.push(Math.max(40, Math.min(480, val)));
    pm25Data.push(Math.round(val * 0.72));
    stubbleData.push(Math.round(20 + Math.sin(i / 2) * 12));
  }

  return { labels: hours, aqi: aqiData, pm25: pm25Data, stubble: stubbleData };
}

export function generate7DayForecast(baseAqi) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayIdx = new Date().getDay();
  const labels = [];
  const minAqi = [];
  const maxAqi = [];
  const avgAqi = [];

  for (let i = 0; i < 7; i++) {
    const dayName = i === 0 ? 'Today' : days[(todayIdx + i) % 7];
    labels.push(dayName);
    const variance = (i * 8) - (i > 3 ? 25 : 0);
    const avg = Math.round(baseAqi + variance);
    avgAqi.push(avg);
    minAqi.push(avg - 35);
    maxAqi.push(avg + 45);
  }

  return { labels, avg: avgAqi, min: minAqi, max: maxAqi };
}
