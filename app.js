import { STATIONS, getAQIInfo, AQI_LEVELS } from './assets/js/stationData.js';
import { AQIGauge } from './assets/js/aqiGauge.js';
import { MapTracker } from './assets/js/mapTracker.js';
import { ForecastCharts } from './assets/js/charts.js';
import { fetchLiveWeather, mapWeatherToVisualState, getWeatherStateMetadata } from './assets/js/weatherService.js';

class AirSenseApp {
  constructor() {
    this.stations = [...STATIONS];
    this.currentStationId = 'anand-vihar';
    this.currentRegionFilter = 'all';
    this.currentTheme = localStorage.getItem('airsense_theme') || 'dark';
    this.currentWeatherState = 'moderate-cloudy';
    
    this.gauge = null;
    this.map = null;
    this.charts = null;
    
    // Alert configuration
    this.alertThreshold = parseInt(localStorage.getItem('airsense_alert_thresh') || '300', 10);
    this.browserNotifyEnabled = localStorage.getItem('airsense_browser_notify') !== 'false';
    
    // Timeline scrubber state
    this.scrubberPlaying = false;
    this.scrubberInterval = null;
    this.scrubberHour = new Date().getHours();

    this.init();
  }

  async init() {
    this.setupTheme();
    this.populateStationDropdown();
    this.initVisualComponents();
    this.attachEventListeners();
    this.attachFeatureListeners();
    
    // Initial fetch from live API endpoint (with graceful fallback)
    await this.fetchLiveTelemetry();
    
    this.renderStationData(this.currentStationId);
    this.renderStationsTable();
    this.checkThresholdAlerts();
    
    // Initial weather-reactive update for Clean Light theme
    await this.updateWeatherReactiveTheme();
  }

  // ==========================================
  // Live API Telemetry Fetcher
  // ==========================================
  async fetchLiveTelemetry() {
    try {
      const res = await fetch('/api/stations');
      if (res.ok) {
        const data = await res.json();
        if (data && data.stations && data.stations.length > 0) {
          this.stations = data.stations;
          this.populateStationDropdown();
          this.showToast('Live Telemetry Synced', 'Successfully received telemetry from Global & Delhi NCR network', 'info');
        }
      }
    } catch (e) {
      console.log('Using local telemetry cache (offline or static preview mode)');
    }
  }

  // ==========================================
  // Weather-Reactive Theme Management
  // ==========================================
  setupTheme() {
    const savedTheme = localStorage.getItem('airsense_theme') || 'dark';
    this.setTheme(savedTheme);
  }

  async setTheme(themeName) {
    this.currentTheme = themeName;
    document.documentElement.classList.remove('dark', 'light', 'cyberpunk', 'emerald');
    document.documentElement.classList.add(themeName);
    localStorage.setItem('airsense_theme', themeName);

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = themeName;

    const isDarkTheme = themeName !== 'light';
    if (this.map) this.map.updateTileTheme(isDarkTheme);
    if (this.charts) {
      const station = this.stations.find(s => s.id === this.currentStationId);
      if (station) this.charts.updateCharts(station);
    }
    if (this.gauge) this.gauge.draw();

    // Trigger weather reactive adaptation for Clean Light theme
    await this.updateWeatherReactiveTheme();
  }

  async updateWeatherReactiveTheme(stationOverride = null) {
    const station = stationOverride || this.stations.find(s => s.id === this.currentStationId);
    if (!station) return;

    // Fetch live weather data (with 15-minute caching)
    const weather = await fetchLiveWeather(station.lat, station.lng);
    const visualState = mapWeatherToVisualState(weather);
    this.currentWeatherState = visualState;
    const meta = getWeatherStateMetadata(visualState, weather);

    // Weather classes to toggle
    const weatherClasses = ['weather-clear', 'weather-moderate-cloudy', 'weather-overcast', 'weather-rain', 'weather-night'];

    if (this.currentTheme === 'light') {
      document.documentElement.setAttribute('data-weather', visualState);
      weatherClasses.forEach(c => document.documentElement.classList.remove(c));
      document.documentElement.classList.add(`weather-${visualState}`);

      const chip = document.getElementById('weather-reactive-chip');
      if (chip) {
        chip.style.display = 'inline-flex';
        chip.innerHTML = `<span class="weather-icon">${meta.icon}</span><span class="weather-text">${meta.label}</span>`;
        chip.title = `Live Weather Ambiance for ${station.name}: ${meta.description}`;
      }
    } else {
      document.documentElement.removeAttribute('data-weather');
      weatherClasses.forEach(c => document.documentElement.classList.remove(c));
      const chip = document.getElementById('weather-reactive-chip');
      if (chip) {
        chip.style.display = 'none';
      }
    }
  }

  // ==========================================
  // Component Initializations
  // ==========================================
  populateStationDropdown() {
    const select = document.getElementById('station-select');
    if (!select) return;
    select.innerHTML = '';

    const groups = [
      { label: '📍 Delhi NCR (20 Zones)', region: 'Delhi NCR' },
      { label: '🇮🇳 India Metros', region: 'India' },
      { label: '🌍 Global World Cities', region: 'Global' }
    ];

    groups.forEach(g => {
      const optGroup = document.createElement('optgroup');
      optGroup.label = g.label;
      const filtered = this.stations.filter(s => s.region === g.region);
      
      filtered.forEach(station => {
        const opt = document.createElement('option');
        opt.value = station.id;
        opt.textContent = `${station.flag || '📍'} ${station.name} (AQI ${station.aqi})`;
        optGroup.appendChild(opt);
      });

      if (filtered.length > 0) {
        select.appendChild(optGroup);
      }
    });

    select.value = this.currentStationId;
  }

  initVisualComponents() {
    this.gauge = new AQIGauge('aqi-gauge-canvas');
    this.map = new MapTracker('leaflet-map', (selectedId) => {
      this.selectStation(selectedId);
    });
    this.charts = new ForecastCharts('chart-24h', 'chart-7d', 'chart-radar');
  }

  // ==========================================
  // Core Event Listeners
  // ==========================================
  attachEventListeners() {
    // Multi-Theme Selector
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.setTheme(e.target.value);
        this.showToast('Theme Changed', `Switched to ${e.target.options[e.target.selectedIndex].text}`, 'info');
      });
    }

    // Station Select Dropdown
    const stationSelect = document.getElementById('station-select');
    if (stationSelect) {
      stationSelect.addEventListener('change', (e) => {
        this.selectStation(e.target.value);
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.style.transform = 'rotate(360deg)';
        refreshBtn.style.transition = 'transform 0.6s ease';
        setTimeout(() => {
          refreshBtn.style.transform = 'none';
          refreshBtn.style.transition = 'none';
          this.refreshLiveData();
        }, 600);
      });
    }

    // Region filter tabs in table
    const regionTabs = document.querySelectorAll('.region-tab-btn');
    regionTabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        regionTabs.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentRegionFilter = e.currentTarget.getAttribute('data-region');
        const searchVal = document.getElementById('station-search-input')?.value || '';
        this.renderStationsTable(searchVal);
      });
    });

    // Search Station Table
    const searchInput = document.getElementById('station-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderStationsTable(e.target.value);
      });
    }

    // Window resize
    window.addEventListener('resize', () => {
      if (this.gauge) {
        this.gauge.setupCanvas();
        this.gauge.draw();
      }
    });
  }

  // ==========================================
  // Advanced Features: Compare, Alerts, Export, Scrubber
  // ==========================================
  attachFeatureListeners() {
    // Compare Button & Modal
    const compareBtn = document.getElementById('compare-btn');
    const compareModal = document.getElementById('compare-modal');
    const closeCompareBtn = document.getElementById('close-compare-modal');
    const compareSelect1 = document.getElementById('compare-station-1');
    const compareSelect2 = document.getElementById('compare-station-2');

    if (compareBtn && compareModal) {
      compareBtn.addEventListener('click', () => {
        this.populateCompareSelectors();
        this.renderCompareView();
        compareModal.style.display = 'flex';
      });
    }

    if (closeCompareBtn && compareModal) {
      closeCompareBtn.addEventListener('click', () => {
        compareModal.style.display = 'none';
      });
    }

    if (compareSelect1 && compareSelect2) {
      compareSelect1.addEventListener('change', () => this.renderCompareView());
      compareSelect2.addEventListener('change', () => this.renderCompareView());
    }

    // Alerts Button & Modal
    const alertsBtn = document.getElementById('alerts-btn');
    const alertModal = document.getElementById('alerts-modal');
    const closeAlertBtn = document.getElementById('close-alerts-modal');
    const saveAlertBtn = document.getElementById('save-alerts-btn');
    const threshSlider = document.getElementById('alert-threshold-slider');
    const threshLbl = document.getElementById('threshold-val-lbl');

    if (threshSlider && threshLbl) {
      threshSlider.value = this.alertThreshold;
      threshLbl.textContent = `${this.alertThreshold} (${getAQIInfo(this.alertThreshold).label})`;
      threshSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        threshLbl.textContent = `${val} (${getAQIInfo(val).label})`;
      });
    }

    if (alertsBtn && alertModal) {
      alertsBtn.addEventListener('click', () => {
        alertModal.style.display = 'flex';
      });
    }

    if (closeAlertBtn && alertModal) {
      closeAlertBtn.addEventListener('click', () => {
        alertModal.style.display = 'none';
      });
    }

    if (saveAlertBtn && alertModal) {
      saveAlertBtn.addEventListener('click', () => {
        if (threshSlider) {
          this.alertThreshold = parseInt(threshSlider.value, 10);
          localStorage.setItem('airsense_alert_thresh', this.alertThreshold);
        }
        const notifyToggle = document.getElementById('toggle-desktop-notify');
        if (notifyToggle) {
          this.browserNotifyEnabled = notifyToggle.checked;
          localStorage.setItem('airsense_browser_notify', this.browserNotifyEnabled);
          if (this.browserNotifyEnabled && 'Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
          }
        }
        alertModal.style.display = 'none';
        this.showToast('Settings Saved', `AQI threshold set to ${this.alertThreshold}+`, 'success');
        this.checkThresholdAlerts();
      });
    }

    // Export CSV Report
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportTelemetryReport();
      });
    }

    // 24-Hour Timeline Scrubber & Simulation
    const timeSlider = document.getElementById('time-slider');
    const scrubberPlayBtn = document.getElementById('scrubber-play-btn');
    const scrubberResetBtn = document.getElementById('scrubber-reset-btn');

    if (timeSlider) {
      timeSlider.addEventListener('input', (e) => {
        this.stopScrubberPlayback();
        const hour = parseInt(e.target.value, 10);
        this.simulateDiurnalHour(hour);
      });
    }

    if (scrubberPlayBtn) {
      scrubberPlayBtn.addEventListener('click', () => {
        this.toggleScrubberPlayback();
      });
    }

    if (scrubberResetBtn) {
      scrubberResetBtn.addEventListener('click', () => {
        this.stopScrubberPlayback();
        const nowHour = new Date().getHours();
        if (timeSlider) timeSlider.value = nowHour;
        this.simulateDiurnalHour(nowHour, true);
        this.showToast('Live Mode', 'Reset scrubber to live telemetry', 'info');
      });
    }
  }

  populateCompareSelectors() {
    const s1 = document.getElementById('compare-station-1');
    const s2 = document.getElementById('compare-station-2');
    if (!s1 || !s2) return;

    [s1, s2].forEach(select => {
      select.innerHTML = '';
      const groups = [
        { label: '📍 Delhi NCR', region: 'Delhi NCR' },
        { label: '🇮🇳 India Metros', region: 'India' },
        { label: '🌍 Global World Cities', region: 'Global' }
      ];

      groups.forEach(g => {
        const optGroup = document.createElement('optgroup');
        optGroup.label = g.label;
        const filtered = this.stations.filter(s => s.region === g.region);
        filtered.forEach(st => {
          const opt = document.createElement('option');
          opt.value = st.id;
          opt.textContent = `${st.flag || '📍'} ${st.name} (AQI ${st.aqi})`;
          optGroup.appendChild(opt);
        });
        if (filtered.length > 0) select.appendChild(optGroup);
      });
    });

    s1.value = this.currentStationId;
    s2.value = this.stations.find(s => s.id !== this.currentStationId)?.id || this.stations[1].id;
  }

  renderCompareView() {
    const s1Id = document.getElementById('compare-station-1')?.value;
    const s2Id = document.getElementById('compare-station-2')?.value;
    const container = document.getElementById('compare-metrics-container');
    if (!container) return;

    const st1 = this.stations.find(s => s.id === s1Id) || this.stations[0];
    const st2 = this.stations.find(s => s.id === s2Id) || this.stations[1];

    const info1 = getAQIInfo(st1.aqi);
    const info2 = getAQIInfo(st2.aqi);

    const aqiDiff = st1.aqi - st2.aqi;
    const pm25Diff = st1.pm25 - st2.pm25;

    container.innerHTML = `
      <div class="compare-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <div>
            <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">${st1.region}</span>
            <h3 style="color: ${info1.color}; font-size: 1.1rem; margin: 2px 0 0 0;">${st1.flag || ''} ${st1.name}</h3>
          </div>
          <span class="table-aqi-pill" style="background: ${info1.color}; font-size: 0.85rem;">AQI ${st1.aqi}</span>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 1rem;">${info1.label} - ${info1.desc}</p>
        <div class="compare-metric-row"><span class="compare-metric-lbl">PM2.5 Concentration</span><span class="compare-metric-val" style="color:${info1.color}">${st1.pm25} µg/m³</span></div>
        <div class="compare-metric-row"><span class="compare-metric-lbl">PM10 Concentration</span><span class="compare-metric-val">${st1.pm10} µg/m³</span></div>
        <div class="compare-metric-row"><span class="compare-metric-lbl">Biomass Smoke Share</span><span class="compare-metric-val" style="color: #EF4444">${st1.stubbleShare}%</span></div>
        <div class="compare-metric-row"><span class="compare-metric-lbl">Wind Flow</span><span class="compare-metric-val">${st1.wind.direction} @ ${st1.wind.speed} km/h</span></div>
        <div class="compare-metric-row"><span class="compare-metric-lbl">Ambient Temp</span><span class="compare-metric-val">${st1.temp}°C (${st1.humidity}% RH)</span></div>
      </div>

      <div class="compare-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <div>
            <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">${st2.region}</span>
            <h3 style="color: ${info2.color}; font-size: 1.1rem; margin: 2px 0 0 0;">${st2.flag || ''} ${st2.name}</h3>
          </div>
          <span class="table-aqi-pill" style="background: ${info2.color}; font-size: 0.85rem;">AQI ${st2.aqi}</span>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 1rem;">${info2.label} - ${info2.desc}</p>
        <div class="compare-metric-row"><span class="compare-metric-lbl">PM2.5 Concentration</span><span class="compare-metric-val" style="color:${info2.color}">${st2.pm25} µg/m³</span></div>
        <div class="compare-metric-row"><span class="compare-metric-lbl">PM10 Concentration</span><span class="compare-metric-val">${st2.pm10} µg/m³</span></div>
        <div class="compare-metric-row"><span class="compare-metric-lbl">Biomass Smoke Share</span><span class="compare-metric-val" style="color: #EF4444">${st2.stubbleShare}%</span></div>
        <div class="compare-metric-row"><span class="compare-metric-lbl">Wind Flow</span><span class="compare-metric-val">${st2.wind.direction} @ ${st2.wind.speed} km/h</span></div>
        <div class="compare-metric-row"><span class="compare-metric-lbl">Ambient Temp</span><span class="compare-metric-val">${st2.temp}°C (${st2.humidity}% RH)</span></div>
      </div>
      
      <div style="grid-column: 1 / -1; background: rgba(30, 41, 59, 0.5); padding: 0.9rem 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
        <div><strong>Delta Analysis:</strong> ${st1.name} is <strong>${Math.abs(aqiDiff)} AQI points ${aqiDiff > 0 ? 'more polluted' : 'cleaner'}</strong> than ${st2.name}. (PM2.5 difference: ${Math.abs(pm25Diff)} µg/m³)</div>
      </div>
    `;
  }

  // ==========================================
  // 24-Hour Diurnal Timeline Scrubber
  // ==========================================
  toggleScrubberPlayback() {
    const playBtn = document.getElementById('scrubber-play-btn');
    if (this.scrubberPlaying) {
      this.stopScrubberPlayback();
    } else {
      this.scrubberPlaying = true;
      if (playBtn) playBtn.innerHTML = '<span>⏸</span> Pause';
      const timeSlider = document.getElementById('time-slider');
      
      this.scrubberInterval = setInterval(() => {
        let current = parseInt(timeSlider.value, 10);
        current = (current + 1) % 24;
        timeSlider.value = current;
        this.simulateDiurnalHour(current);
      }, 1000);
    }
  }

  stopScrubberPlayback() {
    this.scrubberPlaying = false;
    if (this.scrubberInterval) {
      clearInterval(this.scrubberInterval);
      this.scrubberInterval = null;
    }
    const playBtn = document.getElementById('scrubber-play-btn');
    if (playBtn) playBtn.innerHTML = '<span id="play-icon">▶</span> Play 24h Loop';
  }

  simulateDiurnalHour(hour, isLive = false) {
    const label = document.getElementById('scrubber-time-label');
    const formattedHour = `${hour.toString().padStart(2, '0')}:00`;
    
    if (label) {
      label.textContent = isLive 
        ? `Current: Live Telemetry (${formattedHour})`
        : `Simulation: ${formattedHour} (Diurnal Inversion Model)`;
    }

    // Diurnal factor
    let factor = 1.0;
    if (hour >= 5 && hour <= 9) factor = 1.22;
    else if (hour >= 20 && hour <= 23) factor = 1.18;
    else if (hour >= 13 && hour <= 16) factor = 0.82;

    const station = this.stations.find(s => s.id === this.currentStationId);
    if (station) {
      const simulatedAqi = Math.round(station.aqi * factor);
      const simulatedStation = {
        ...station,
        aqi: simulatedAqi,
        pm25: Math.round(station.pm25 * factor),
        pm10: Math.round(station.pm10 * factor)
      };
      this.renderStationData(station.id, simulatedStation);
    }
  }

  // ==========================================
  // Export CSV Telemetry Report
  // ==========================================
  exportTelemetryReport() {
    let csv = 'Station ID,Station Name,Region,Country,AQI,Status,PM2.5 (ug/m3),PM10 (ug/m3),NO2 (ppb),SO2 (ppb),CO (mg/m3),Ozone (ppb),Smoke Share (%),Wind Direction,Wind Speed (km/h),Temperature (C),Humidity (%)\n';
    
    this.stations.forEach(s => {
      const info = getAQIInfo(s.aqi);
      csv += `"${s.id}","${s.name}","${s.region}","${s.country || 'India'}",${s.aqi},"${info.label}",${s.pm25},${s.pm10},${s.no2},${s.so2},${s.co},${s.o3},${s.stubbleShare},"${s.wind.direction}",${s.wind.speed},${s.temp},${s.humidity}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AirSense_Global_Telemetry_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('Report Exported', 'Downloaded full World & Delhi NCR pollutant CSV dataset', 'success');
  }

  // ==========================================
  // Audio & Notification Alerts
  // ==========================================
  playAlertChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.warn('Audio chime unsupported or blocked:', e);
    }
  }

  dispatchBrowserNotification(title, body) {
    if (!this.browserNotifyEnabled || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: './favicon.ico' });
    }
  }

  checkThresholdAlerts() {
    const current = this.stations.find(s => s.id === this.currentStationId);
    if (current && current.aqi >= this.alertThreshold) {
      this.playAlertChime();
      this.showToast(
        `⚠️ High Pollution Alert (${current.aqi} AQI)`,
        `${current.name} has exceeded threshold (${this.alertThreshold}). Sensitive groups wear N95!`,
        'severe'
      );
    }
  }

  // ==========================================
  // Toast Notification System
  // ==========================================
  showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'severe' || type === 'danger') icon = '🚨';
    if (type === 'success') icon = '✅';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-desc">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close Notification">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }

  // ==========================================
  // Station Selection & Telemetry Rendering
  // ==========================================
  async selectStation(stationId) {
    this.currentStationId = stationId;

    const select = document.getElementById('station-select');
    if (select) select.value = stationId;

    this.renderStationData(stationId);
    if (this.map) this.map.focusStation(stationId);
    this.checkThresholdAlerts();
    
    // Dynamically adapt Clean Light theme to this station's live weather
    await this.updateWeatherReactiveTheme();
  }

  renderStationData(stationId, overrideData = null) {
    const station = overrideData || this.stations.find(s => s.id === stationId);
    if (!station) return;

    const info = getAQIInfo(station.aqi);

    // Hero Header
    const nameEl = document.getElementById('selected-station-name');
    if (nameEl) nameEl.textContent = `${station.flag || '📍'} ${station.name}`;

    const distBadge = document.getElementById('station-distance-badge');
    if (distBadge) distBadge.textContent = `${station.region} • ${station.city || 'Telemetry'}`;

    const updateTimeEl = document.getElementById('last-updated-time');
    if (updateTimeEl) {
      updateTimeEl.textContent = `Updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Gauge Update
    if (this.gauge) {
      this.gauge.setTargetValue(station.aqi);
    }

    // Current AQI Display
    const aqiValEl = document.getElementById('current-aqi-val');
    if (aqiValEl) {
      aqiValEl.textContent = station.aqi;
      aqiValEl.style.color = info.color;
    }

    const aqiStatusEl = document.getElementById('current-aqi-status');
    if (aqiStatusEl) {
      aqiStatusEl.textContent = info.label;
      aqiStatusEl.style.backgroundColor = info.bgGlow;
      aqiStatusEl.style.color = info.color;
    }

    const descEl = document.getElementById('aqi-desc-text');
    if (descEl) {
      descEl.textContent = info.desc;
      descEl.style.borderLeftColor = info.color;
    }

    // Health Advisories based on AQI
    this.updateHealthAdvisories(station.aqi);

    // Pollutant Values
    document.getElementById('val-pm25').textContent = station.pm25;
    document.getElementById('val-pm10').textContent = station.pm10;
    document.getElementById('val-no2').textContent = station.no2;
    document.getElementById('val-so2').textContent = station.so2;
    document.getElementById('val-co').textContent = station.co;
    document.getElementById('val-o3').textContent = station.o3;

    // Weather
    document.getElementById('weather-wind').textContent = `${station.wind.direction} ${station.wind.speed} km/h`;
    document.getElementById('weather-temp').textContent = `${station.temp}°C`;
    document.getElementById('weather-humidity').textContent = `${station.humidity}%`;
    document.getElementById('weather-visibility').textContent = `${station.visibility} km`;

    // Stubble Alert Banner
    const stubbleValEl = document.getElementById('stubble-pct-val');
    if (stubbleValEl) stubbleValEl.textContent = `${station.stubbleShare}%`;

    const stubbleAlertEl = document.getElementById('stubble-alert-text');
    if (stubbleAlertEl) {
      if (station.region === 'Delhi NCR') {
        stubbleAlertEl.textContent = `Prevailing North-Westerly winds (${station.wind.direction} @ ${station.wind.speed} km/h) are actively transporting agricultural biomass smoke plume into Delhi NCR basin.`;
      } else {
        stubbleAlertEl.textContent = `Live atmospheric telemetry for ${station.name}. Biomass smoke fraction currently measured at ${station.stubbleShare}%.`;
      }
    }

    // Charts
    if (this.charts) {
      this.charts.updateCharts(station);
    }
  }

  updateHealthAdvisories(aqi) {
    const mask = document.getElementById('adv-mask');
    const purifier = document.getElementById('adv-purifier');
    const outdoor = document.getElementById('adv-outdoor');
    const windows = document.getElementById('adv-windows');

    if (aqi > 300) {
      if (mask) mask.textContent = 'N95 Required';
      if (purifier) purifier.textContent = 'Keep On (Max)';
      if (outdoor) outdoor.textContent = 'Avoid Outdoors';
      if (windows) windows.textContent = 'Close Sealed';
    } else if (aqi > 200) {
      if (mask) mask.textContent = 'N95 Recommended';
      if (purifier) purifier.textContent = 'Keep On (Medium)';
      if (outdoor) outdoor.textContent = 'Limit Outdoors';
      if (windows) windows.textContent = 'Keep Closed';
    } else if (aqi > 100) {
      if (mask) mask.textContent = 'Sensitive Groups';
      if (purifier) purifier.textContent = 'Run Indoors';
      if (outdoor) outdoor.textContent = 'Moderate OK';
      if (windows) windows.textContent = 'Open in Aftn';
    } else {
      if (mask) mask.textContent = 'Not Needed';
      if (purifier) purifier.textContent = 'Optional';
      if (outdoor) outdoor.textContent = 'Ideal Conditions';
      if (windows) windows.textContent = 'Open for Air';
    }
  }

  renderStationsTable(filterText = '') {
    const tbody = document.getElementById('stations-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = this.stations.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(filterText.toLowerCase()) ||
                            (s.city && s.city.toLowerCase().includes(filterText.toLowerCase())) ||
                            (s.country && s.country.toLowerCase().includes(filterText.toLowerCase()));
      const matchesRegion = this.currentRegionFilter === 'all' || s.region === this.currentRegionFilter;
      return matchesSearch && matchesRegion;
    });

    filtered.forEach(station => {
      const info = getAQIInfo(station.aqi);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="table-station-name">
            <span>${station.flag || '📍'}</span>
            <span>${station.name}</span>
          </div>
        </td>
        <td>
          <span class="table-region-tag">${station.region}</span>
        </td>
        <td>
          <span class="table-aqi-pill" style="background: ${info.color};">
            ${station.aqi}
          </span>
        </td>
        <td><strong>${station.pm25}</strong> µg/m³</td>
        <td><strong>${station.pm10}</strong> µg/m³</td>
        <td><span style="color: ${station.stubbleShare > 15 ? '#EF4444' : '#10B981'}; font-weight: 600;">${station.stubbleShare}%</span></td>
        <td>${station.wind.direction} ${station.wind.speed} km/h</td>
        <td>${station.temp}°C</td>
        <td>
          <span style="color: ${info.color}; font-weight: 600;">${info.label}</span>
        </td>
      `;

      row.addEventListener('click', () => {
        this.selectStation(station.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      tbody.appendChild(row);
    });
  }

  async refreshLiveData() {
    this.stations.forEach(s => {
      const delta = Math.floor(Math.random() * 7) - 3;
      s.aqi = Math.max(20, Math.min(490, s.aqi + delta));
      s.pm25 = Math.max(10, Math.round(s.aqi * 0.75));
      s.pm10 = Math.max(15, Math.round(s.aqi * 1.12));
    });

    this.renderStationData(this.currentStationId);
    this.renderStationsTable();
    if (this.map) this.map.renderStations();
    
    // Live weather refresh for active location
    await this.updateWeatherReactiveTheme();
    
    this.showToast('Telemetry Updated', 'Refreshed sensor metrics & live weather reactive theme', 'info');
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new AirSenseApp();
});
