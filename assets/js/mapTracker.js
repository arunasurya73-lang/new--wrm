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
    this.windCanvas = null;
    this.currentBaseLayerType = 'satellite'; // 'satellite' | 'dark' | 'streets'
    this.currentScope = 'corridor'; // Default: 'corridor' (Delhi NCR + Punjab/Haryana) | 'delhi' | 'india' | 'world'
    
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

    // Centered initially on Delhi NCR + Punjab/Haryana Stubble-Burning Source Region
    this.map = L.map(this.containerId, {
      center: [29.6500, 76.5000],
      zoom: 7,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // High-Resolution World Basemaps
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

    // Satellite overlay labels for city, country and borders
    this.satelliteLabels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    );

    // Initial basemap: High-Res World Satellite View
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
  // Custom Floating Layer Switcher & Scope Bar
  // ==========================================
  initCustomLayerControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'map-floating-bar';
    controlsContainer.innerHTML = `
      <div class="map-scope-group">
        <button id="map-scope-corridor" class="map-mode-btn ${this.currentScope === 'corridor' ? 'active' : ''}" title="Delhi NCR & Upwind Punjab/Haryana Agricultural Fire Corridor">
          <span>🌾</span> Delhi & Fire Corridor
        </button>
        <button id="map-scope-delhi" class="map-mode-btn ${this.currentScope === 'delhi' ? 'active' : ''}" title="Delhi NCR Telemetry Network (Zoomed)">
          <span>📍</span> Delhi NCR
        </button>
        <button id="map-scope-india" class="map-mode-btn ${this.currentScope === 'india' ? 'active' : ''}" title="India Regional Overview">
          <span>🇮🇳</span> India
        </button>
      </div>
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
          <span>💨</span> Wind
        </button>
        <button id="map-layer-plume" class="map-mode-btn ${this.showSmoke ? 'active' : ''}" title="Biomass Smoke Dispersion Plume">
          <span>🌾</span> Smoke
        </button>
        <button id="map-layer-fires" class="map-mode-btn ${this.showHotspots ? 'active' : ''}" title="NASA Global Satellite Thermal Fires">
          <span>🔥</span> Fires
        </button>
      </div>
    `;

    const mapWrap = document.querySelector('.map-container-wrap');
    if (mapWrap) {
      mapWrap.appendChild(controlsContainer);

      // Event Listeners for Scope Switchers
      document.getElementById('map-scope-corridor')?.addEventListener('click', () => this.setScope('corridor'));
      document.getElementById('map-scope-delhi')?.addEventListener('click', () => this.setScope('delhi'));
      document.getElementById('map-scope-india')?.addEventListener('click', () => this.setScope('india'));

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

  setScope(scope) {
    this.currentScope = scope;
    ['corridor', 'delhi', 'india'].forEach(s => {
      document.getElementById(`map-scope-${s}`)?.classList.toggle('active', s === scope);
    });

    if (scope === 'corridor') {
      this.map.flyTo([29.65, 76.50], 7, { duration: 1.2 });
    } else if (scope === 'delhi') {
      this.map.flyTo([28.66, 77.16], 10, { duration: 1.2 });
    } else if (scope === 'india') {
      this.map.flyTo([22.5, 78.9], 5, { duration: 1.2 });
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
      const isGlobal = station.region === 'Global';
      const radiusMeters = isGlobal ? Math.max(30000, station.aqi * 450) : Math.max(4000, Math.min(9000, station.aqi * 22));

      // Atmospheric dispersion halo
      const outerHalo = L.circle([station.lat, station.lng], {
        radius: radiusMeters,
        color: 'transparent',
        fillColor: info.color,
        fillOpacity: 0.14,
        interactive: false
      });

      const coreHalo = L.circle([station.lat, station.lng], {
        radius: radiusMeters * 0.45,
        color: 'transparent',
        fillColor: info.color,
        fillOpacity: 0.28,
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
      const flagStr = station.flag ? `<span class="pin-flag">${station.flag}</span>` : '';
      
      const customIcon = L.divIcon({
        className: 'custom-station-pin',
        html: `
          <div class="station-pin-wrap" style="--pin-color: ${info.color}; --pin-glow: ${info.bgGlow};">
            <div class="station-pin-pulse"></div>
            <div class="station-pin-badge">
              ${flagStr}
              <span class="pin-value">${station.aqi}</span>
            </div>
            <div class="station-pin-arrow"></div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 42]
      });

      const marker = L.marker([station.lat, station.lng], { icon: customIcon }).addTo(this.map);
      
      const popupHtml = `
        <div class="map-popup-card">
          <div class="popup-header">
            <div>
              <div style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">
                ${station.flag || '📍'} ${station.city}, ${station.country}
              </div>
              <h4 style="margin: 2px 0 0 0; font-size: 0.95rem;">${station.name}</h4>
            </div>
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

      marker.bindPopup(popupHtml, { maxWidth: 330, className: 'airsense-custom-popup' });

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

    // 1. Broad Outer Atmospheric Smoke Haze (Indo-Gangetic Basin Transport Corridor)
    const outerPlume = L.polygon([
      [31.45, 74.60],
      [31.60, 76.70],
      [30.40, 78.10],
      [28.95, 77.95],
      [28.15, 77.40],
      [28.45, 76.10],
      [29.50, 74.90],
      [30.60, 74.50]
    ], {
      stroke: false,
      fillColor: '#b45309',
      fillOpacity: 0.24,
      className: 'realistic-smoke-outer',
      interactive: false
    });

    // 2. High-Density Core Biomass Smoke Stream
    const corePlume = L.polygon([
      [31.00, 75.40],
      [30.85, 76.85],
      [30.00, 77.40],
      [29.10, 77.55],
      [28.40, 77.30],
      [28.90, 76.45],
      [30.00, 75.60]
    ], {
      stroke: true,
      color: 'rgba(239, 68, 68, 0.4)',
      weight: 1,
      dashArray: '6, 12',
      fillColor: '#991b1b',
      fillOpacity: 0.32,
      className: 'realistic-smoke-core',
      interactive: false
    });

    // 3. Dense Smoke Accumulation Centroids (Gaussian-Diffused Hotspot Zones)
    const smokeCentroids = [
      { center: [30.70, 75.90], radius: 48000, opacity: 0.28, color: '#7c2d12' }, // Punjab Agricultural Fire Belt
      { center: [29.85, 76.85], radius: 40000, opacity: 0.25, color: '#9a3412' }, // Kurukshetra / Karnal Corridor
      { center: [28.75, 77.18], radius: 32000, opacity: 0.30, color: '#b91c1c' }  // Delhi NCR Fumigation Basin
    ];

    smokeCentroids.forEach(c => {
      const circle = L.circle(c.center, {
        radius: c.radius,
        stroke: false,
        fillColor: c.color,
        fillOpacity: c.opacity,
        className: 'realistic-smoke-core',
        interactive: false
      });
      this.smokeLayer.addLayer(circle);
    });

    outerPlume.bindTooltip("<b>Biomass Smoke Dispersion Plume</b><br>North-Westerly transport corridor carrying PM2.5 into Delhi NCR basin", { sticky: true });
    this.smokeLayer.addLayer(outerPlume);
    this.smokeLayer.addLayer(corePlume);

    if (this.showSmoke) {
      this.smokeLayer.addTo(this.map);
    }
  }

  // ==========================================
  // Realistic Global & Regional Fire Hotspots
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
          <b>Classification:</b> ${fire.type || 'Biomass Fire'}<br>
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
  // Animated Wind Particles & Drifting Smoke Streamlines
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

    // Generate streaming wind particles
    const particleCount = 130;
    this.windParticles = [];
    for (let i = 0; i < particleCount; i++) {
      this.windParticles.push(this.createRandomParticle());
    }

    // Generate animated drifting smoke plume puffs
    this.smokePuffs = [];
    for (let i = 0; i < 35; i++) {
      this.smokePuffs.push(this.createSmokePuff());
    }

    this.animateWind();
  }

  createRandomParticle() {
    const size = this.map.getSize();
    return {
      x: Math.random() * size.x,
      y: Math.random() * size.y,
      length: Math.random() * 16 + 10,
      speed: Math.random() * 1.8 + 1.2,
      opacity: Math.random() * 0.7 + 0.2,
      age: Math.random() * 100
    };
  }

  createSmokePuff() {
    const size = this.map.getSize();
    // Emitters in the upwind Punjab/Haryana fire corridor
    const fireHotspotsNW = [
      [30.90, 75.85], // Ludhiana
      [30.34, 76.38], // Sangrur / Patiala
      [29.68, 76.99], // Karnal
      [31.14, 75.34], // Moga
      [29.96, 76.87]  // Kurukshetra
    ];
    const origin = fireHotspotsNW[Math.floor(Math.random() * fireHotspotsNW.length)];
    const pt = this.map.latLngToContainerPoint(origin);

    return {
      originLat: origin[0],
      originLng: origin[1],
      x: pt.x + (Math.random() * 40 - 20),
      y: pt.y + (Math.random() * 40 - 20),
      radius: Math.random() * 18 + 14,
      maxRadius: Math.random() * 55 + 45,
      speed: Math.random() * 0.8 + 0.6,
      opacity: Math.random() * 0.45 + 0.25,
      age: Math.random() * 80,
      maxAge: 180 + Math.random() * 80
    };
  }

  animateWind() {
    if (!this.windCanvas) return;
    const ctx = this.windCanvas.getContext('2d');
    const size = this.map.getSize();

    ctx.clearRect(0, 0, size.x, size.y);

    // Atmospheric vector flow: NW (315°) towards SE (135°)
    const angle = (135 * Math.PI) / 180;
    const vx = Math.cos(angle);
    const vy = Math.sin(angle);

    // 1. Render Drifting Smoke Haze Puffs (if Smoke layer is active)
    if (this.showSmoke && this.smokePuffs) {
      this.smokePuffs.forEach(puff => {
        puff.x += vx * puff.speed;
        puff.y += vy * puff.speed;
        puff.age++;

        // Expand radius as smoke disperses downwind
        const progress = puff.age / puff.maxAge;
        const currentRadius = puff.radius + (puff.maxRadius - puff.radius) * progress;
        const currentOpacity = puff.opacity * (1 - Math.pow(progress, 1.4));

        if (puff.age > puff.maxAge || puff.x > size.x + 100 || puff.y > size.y + 100) {
          const pt = this.map.latLngToContainerPoint([puff.originLat, puff.originLng]);
          puff.x = pt.x + (Math.random() * 30 - 15);
          puff.y = pt.y + (Math.random() * 30 - 15);
          puff.age = 0;
        }

        // Draw soft radial smoke gradient puff
        if (currentOpacity > 0.02 && puff.x >= -60 && puff.x <= size.x + 60 && puff.y >= -60 && puff.y <= size.y + 60) {
          const grad = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, currentRadius);
          grad.addColorStop(0, `rgba(180, 83, 9, ${currentOpacity * 0.7})`);
          grad.addColorStop(0.45, `rgba(154, 52, 18, ${currentOpacity * 0.45})`);
          grad.addColorStop(0.8, `rgba(124, 45, 18, ${currentOpacity * 0.18})`);
          grad.addColorStop(1, 'rgba(124, 45, 18, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(puff.x, puff.y, currentRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 2. Render Wind Streamlines (if Wind layer is active)
    if (this.showWindFlow && this.windParticles) {
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
      const zoomLevel = station.region === 'Global' ? 11 : 13;
      this.map.flyTo([station.lat, station.lng], zoomLevel, { duration: 1.2 });
    }
  }
}
