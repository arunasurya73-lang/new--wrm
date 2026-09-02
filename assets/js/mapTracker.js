import { STATIONS, STUBBLE_FIRE_HOTSPOTS, getAQIInfo } from './stationData.js';

export class MapTracker {
  constructor(mapContainerId, onStationSelect) {
    this.containerId = mapContainerId;
    this.onStationSelect = onStationSelect;
    this.map = null;
    this.stationMarkers = [];
    this.smokeLayer = null;
    this.hotspotLayer = null;
    this.heatHaloLayer = null;
    this.windParticleLayer = null;
    this.currentBaseLayerType = 'satellite'; // 'satellite' | 'dark' | 'streets'
    this.showSmoke = true;
    this.showHotspots = true;
    this.showWindFlow = true;
    this.showHeatHalos = true;
    
    // Wind particle animation state
    this.windParticles = [];
    this.animationFrameId = null;

    this.initMap();
  }

  initMap() {
    if (!window.L) {
      console.error('Leaflet library not loaded');
      return;
    }

    // Centered over Delhi NCR with broad view of Northern agricultural corridors
    this.map = L.map(this.containerId, {
      center: [28.6600, 77.1600],
      zoom: 10,
      minZoom: 7,
      maxZoom: 18,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // High-Resolution Basemaps
    this.baseLayers = {
      satellite: L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
          maxZoom: 18
        }
      ),
      dark: L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri &copy; OpenStreetMap',
          maxZoom: 16
        }
      ),
      streets: L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18
        }
      )
    };

    // Satellite overlay labels for city and highway names
    this.satelliteLabels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    );

    // Initial basemap: High-Res Satellite View
    this.baseLayers[this.currentBaseLayerType].addTo(this.map);
    if (this.currentBaseLayerType === 'satellite') {
      this.satelliteLabels.addTo(this.map);
    }

    this.initCustomLayerControls();
    this.renderStations();
    this.renderAQIHeatHalos();
    this.renderRealisticSmokePlumes();
    this.renderRealisticHotspots();
    this.initWindParticleFlow();
  }

  // ==========================================
  // Custom Floating Layer Switcher
  // ==========================================
  initCustomLayerControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'map-floating-bar';
    controlsContainer.innerHTML = `
      <div class="map-view-toggle-group">
        <button id="map-mode-satellite" class="map-mode-btn ${this.currentBaseLayerType === 'satellite' ? 'active' : ''}" title="Realistic HD Satellite Imagery">
          <span>🛰️</span> Satellite
        </button>
        <button id="map-mode-dark" class="map-mode-btn ${this.currentBaseLayerType === 'dark' ? 'active' : ''}" title="Dark Telemetry Canvas">
          <span>🌑</span> Dark
        </button>
      </div>
      <div class="map-toggle-group">
        <button id="map-layer-wind" class="map-mode-btn ${this.showWindFlow ? 'active' : ''}" title="Live Animated Wind Vectors">
          <span>💨</span> Wind Flow
        </button>
        <button id="map-layer-plume" class="map-mode-btn ${this.showSmoke ? 'active' : ''}" title="Atmospheric Smoke Plume">
          <span>🌾</span> Smoke
        </button>
        <button id="map-layer-fires" class="map-mode-btn ${this.showHotspots ? 'active' : ''}" title="NASA Satellite Thermal Anomalies">
          <span>🔥</span> Fires
        </button>
      </div>
    `;

    const mapWrap = document.querySelector('.map-container-wrap');
    if (mapWrap) {
      mapWrap.appendChild(controlsContainer);

      // Event Listeners for Layer Toggles
      document.getElementById('map-mode-satellite')?.addEventListener('click', () => this.switchBaseMap('satellite'));
      document.getElementById('map-mode-dark')?.addEventListener('click', () => this.switchBaseMap('dark'));
      document.getElementById('map-layer-wind')?.addEventListener('click', (e) => {
        this.showWindFlow = !this.showWindFlow;
        e.currentTarget.classList.toggle('active', this.showWindFlow);
        if (this.windCanvas) this.windCanvas.style.display = this.showWindFlow ? 'block' : 'none';
      });
      document.getElementById('map-layer-plume')?.addEventListener('click', (e) => {
        this.showSmoke = !this.showSmoke;
        e.currentTarget.classList.toggle('active', this.showSmoke);
        this.toggleSmokeLayer(this.showSmoke);
      });
      document.getElementById('map-layer-fires')?.addEventListener('click', (e) => {
        this.showHotspots = !this.showHotspots;
        e.currentTarget.classList.toggle('active', this.showHotspots);
        this.toggleHotspotLayer(this.showHotspots);
      });
    }
  }

  switchBaseMap(type) {
    if (type === this.currentBaseLayerType) return;
    this.map.removeLayer(this.baseLayers[this.currentBaseLayerType]);
    if (this.map.hasLayer(this.satelliteLabels)) this.map.removeLayer(this.satelliteLabels);

    this.currentBaseLayerType = type;
    this.baseLayers[type].addTo(this.map);
    if (type === 'satellite') {
      this.satelliteLabels.addTo(this.map);
    }

    document.getElementById('map-mode-satellite')?.classList.toggle('active', type === 'satellite');
    document.getElementById('map-mode-dark')?.classList.toggle('active', type === 'dark');
  }

  updateTileTheme(isDark) {
    if (this.currentBaseLayerType !== 'satellite') {
      this.switchBaseMap(isDark ? 'dark' : 'streets');
    }
  }

  // ==========================================
  // Realistic AQI Spatial Interpolation Halos
  // ==========================================
  renderAQIHeatHalos() {
    if (this.heatHaloLayer) this.heatHaloLayer.remove();
    this.heatHaloLayer = L.layerGroup();

    STATIONS.forEach(station => {
      const info = getAQIInfo(station.aqi);
      const radiusMeters = Math.max(3000, Math.min(8500, station.aqi * 20));

      // Concentric atmospheric dispersion gradient circles
      const outerHalo = L.circle([station.lat, station.lng], {
        radius: radiusMeters,
        color: 'transparent',
        fillColor: info.color,
        fillOpacity: 0.12,
        interactive: false
      });

      const coreHalo = L.circle([station.lat, station.lng], {
        radius: radiusMeters * 0.45,
        color: 'transparent',
        fillColor: info.color,
        fillOpacity: 0.25,
        interactive: false
      });

      this.heatHaloLayer.addLayer(outerHalo);
      this.heatHaloLayer.addLayer(coreHalo);
    });

    if (this.showHeatHalos) {
      this.heatHaloLayer.addTo(this.map);
    }
  }

  // ==========================================
  // Station Pins with 3D Depth & Neon Badges
  // ==========================================
  renderStations() {
    this.stationMarkers.forEach(m => m.remove());
    this.stationMarkers = [];

    STATIONS.forEach(station => {
      const info = getAQIInfo(station.aqi);
      
      const customIcon = L.divIcon({
        className: 'custom-station-pin',
        html: `
          <div class="station-pin-wrap" style="--pin-color: ${info.color}; --pin-glow: ${info.bgGlow};">
            <div class="station-pin-pulse"></div>
            <div class="station-pin-badge">
              <span class="pin-value">${station.aqi}</span>
            </div>
            <div class="station-pin-arrow"></div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 40]
      });

      const marker = L.marker([station.lat, station.lng], { icon: customIcon }).addTo(this.map);
      
      const popupHtml = `
        <div class="map-popup-card">
          <div class="popup-header">
            <h4>${station.name}</h4>
            <span class="popup-badge" style="background: ${info.color}; color: #fff;">${info.label}</span>
          </div>
          <div class="popup-aqi-row">
            <div class="popup-aqi-box">
              <span class="lbl">AQI</span>
              <span class="val" style="color: ${info.color};">${station.aqi}</span>
            </div>
            <div class="popup-pm-box">
              <span class="lbl">PM2.5</span>
              <span class="val">${station.pm25} µg/m³</span>
            </div>
            <div class="popup-pm-box">
              <span class="lbl">PM10</span>
              <span class="val">${station.pm10} µg/m³</span>
            </div>
          </div>
          <div class="popup-weather-row">
            <span>💨 ${station.wind.direction} ${station.wind.speed} km/h</span>
            <span>🌡️ ${station.temp}°C</span>
            <span>💧 ${station.humidity}%</span>
          </div>
          <button class="popup-select-btn" data-station-id="${station.id}">Focus & Inspect Station</button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 320, className: 'airsense-custom-popup' });

      marker.on('popupopen', () => {
        const btn = document.querySelector(`.popup-select-btn[data-station-id="${station.id}"]`);
        if (btn) {
          btn.addEventListener('click', () => {
            if (this.onStationSelect) this.onStationSelect(station.id);
            this.map.closePopup();
          });
        }
      });

      this.stationMarkers.push(marker);
    });
  }

  // ==========================================
  // Realistic Multi-Layered Biomass Smoke Plume
  // ==========================================
  renderRealisticSmokePlumes() {
    if (this.smokeLayer) this.smokeLayer.remove();
    this.smokeLayer = L.layerGroup();

    // 1. Primary Inversion Dispersion Envelope
    const outerPlume = L.polygon([
      [31.20, 74.80],
      [31.40, 76.50],
      [30.20, 77.80],
      [28.80, 77.70],
      [28.25, 77.25],
      [28.70, 76.20],
      [29.80, 75.20]
    ], {
      color: '#f97316',
      weight: 1.2,
      dashArray: '5, 8',
      fillColor: '#c2410c',
      fillOpacity: 0.22,
      interactive: false
    });

    // 2. Dense Core Plume (Heavy PM2.5 Accumulation)
    const corePlume = L.polygon([
      [30.90, 75.60],
      [30.70, 76.70],
      [29.90, 77.20],
      [28.95, 77.40],
      [28.50, 77.20],
      [29.20, 76.50]
    ], {
      color: '#ef4444',
      weight: 1.5,
      fillColor: '#991b1b',
      fillOpacity: 0.32,
      interactive: false
    });

    outerPlume.bindTooltip("<b>Biomass Smoke Dispersion Plume</b><br>North-Westerly transport corridor carrying PM2.5 into Delhi basin", { sticky: true });
    this.smokeLayer.addLayer(outerPlume);
    this.smokeLayer.addLayer(corePlume);

    if (this.showSmoke) {
      this.smokeLayer.addTo(this.map);
    }
  }

  // ==========================================
  // Realistic Satellite Farm Fire Hotspots
  // ==========================================
  renderRealisticHotspots() {
    if (this.hotspotLayer) this.hotspotLayer.remove();
    this.hotspotLayer = L.layerGroup();

    STUBBLE_FIRE_HOTSPOTS.forEach(fire => {
      const fireIcon = L.divIcon({
        className: 'fire-realistic-pin',
        html: `
          <div class="fire-flame-container">
            <div class="fire-glow-ring"></div>
            <div class="fire-core-flame">🔥</div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([fire.lat, fire.lng], { icon: fireIcon });
      marker.bindTooltip(`
        <div style="font-family:'Inter', sans-serif;">
          <strong style="color: #EF4444;">🛰️ NASA FIRMS Thermal Anomaly</strong><br>
          <b>Location:</b> ${fire.region}<br>
          <b>Intensity:</b> ${fire.intensity}
        </div>
      `, { direction: 'top', className: 'airsense-custom-tooltip' });

      this.hotspotLayer.addLayer(marker);
    });

    if (this.showHotspots) {
      this.hotspotLayer.addTo(this.map);
    }
  }

  // ==========================================
  // Animated Wind Particle Streamlines
  // ==========================================
  initWindParticleFlow() {
    const mapPane = this.map.getPanes().overlayPane;
    this.windCanvas = document.createElement('canvas');
    this.windCanvas.className = 'map-wind-particle-canvas';
    this.windCanvas.style.position = 'absolute';
    this.windCanvas.style.top = '0';
    this.windCanvas.style.left = '0';
    this.windCanvas.style.pointerEvents = 'none';
    this.windCanvas.style.zIndex = '400';
    mapPane.appendChild(this.windCanvas);

    const resizeCanvas = () => {
      const size = this.map.getSize();
      this.windCanvas.width = size.x;
      this.windCanvas.height = size.y;
      const topLeft = this.map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this.windCanvas, topLeft);
    };

    this.map.on('move resize zoom', resizeCanvas);
    resizeCanvas();

    // Generate 120 streaming wind particles
    const particleCount = 120;
    this.windParticles = [];
    for (let i = 0; i < particleCount; i++) {
      this.windParticles.push(this.createRandomParticle());
    }

    this.animateWind();
  }

  createRandomParticle() {
    const size = this.map.getSize();
    return {
      x: Math.random() * size.x,
      y: Math.random() * size.y,
      length: Math.random() * 14 + 10,
      speed: Math.random() * 1.8 + 1.2,
      opacity: Math.random() * 0.7 + 0.2,
      age: Math.random() * 100
    };
  }

  animateWind() {
    if (!this.windCanvas) return;
    const ctx = this.windCanvas.getContext('2d');
    const size = this.map.getSize();

    if (this.showWindFlow) {
      ctx.clearRect(0, 0, size.x, size.y);

      // Wind vector: NW (315°) towards SE (135°)
      const angle = (135 * Math.PI) / 180;
      const vx = Math.cos(angle);
      const vy = Math.sin(angle);

      this.windParticles.forEach(p => {
        p.x += vx * p.speed;
        p.y += vy * p.speed;
        p.age++;

        // Reset when out of bounds or expired
        if (p.x > size.x + 50 || p.y > size.y + 50 || p.age > 160) {
          p.x = Math.random() * (size.x * 0.8) - 50;
          p.y = Math.random() * 40 - 40;
          p.age = 0;
        }

        ctx.strokeStyle = `rgba(249, 115, 22, ${p.opacity * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - vx * p.length, p.y - vy * p.length);
        ctx.stroke();
      });
    }

    this.animationFrameId = requestAnimationFrame(() => this.animateWind());
  }

  // ==========================================
  // Layer Toggles & Focus
  // ==========================================
  toggleSmokeLayer(visible) {
    this.showSmoke = visible;
    if (visible) {
      this.smokeLayer.addTo(this.map);
    } else {
      this.smokeLayer.remove();
    }
  }

  toggleHotspotLayer(visible) {
    this.showHotspots = visible;
    if (visible) {
      this.hotspotLayer.addTo(this.map);
    } else {
      this.hotspotLayer.remove();
    }
  }

  focusStation(stationId) {
    const station = STATIONS.find(s => s.id === stationId);
    if (station && this.map) {
      this.map.flyTo([station.lat, station.lng], 13, { duration: 1.2 });
    }
  }
}
