import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

function FireMap({ fireLocations, windDirection, windSpeed }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map centered on North India, zoom level 7
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [29.5, 76.5], // Center lat 29.5, lon 76.5
        zoom: 7, // Zoom level 7 (shows Delhi, Punjab, and Haryana)
        minZoom: 3,
        maxZoom: 14,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true
      });

      // Add CartoDB Dark Matter tiles with required attribution
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: 'Map &copy; CartoDB | Data &copy; OpenStreetMap',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstance.current);

      // Fetch and display GeoJSON for India state boundaries
      fetch('https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson')
        .then(res => res.json())
        .then(data => {
          if (!mapInstance.current) return;
          L.geoJSON(data, {
            style: {
              color: '#374151', // Dark gray state boundary line
              weight: 1.2,
              fillColor: 'transparent',
              fillOpacity: 0
            },
            interactive: false
          }).addTo(mapInstance.current);
        })
        .catch(err => console.error("Error loading India GeoJSON in FireMap:", err));

      layerGroupRef.current = L.layerGroup().addTo(mapInstance.current);
    }

    // Clear old drawings
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
    }

    // 1. Shaded blue polygon overlay over Delhi NCR area
    const delhiNcrPolygon = L.polygon([
      [28.88, 76.84],
      [28.88, 77.35],
      [28.40, 77.35],
      [28.40, 76.84]
    ], {
      color: '#3B82F6',
      fillColor: '#3B82F6',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '5, 5'
    });
    
    delhiNcrPolygon.bindPopup(`
      <div style="font-family: 'Inter', sans-serif; font-size: 12px; color: #fff;">
        <strong style="color: #3B82F6;">Delhi NCR Airshed Boundary</strong><br>
        Low geography traps agricultural smoke within this critical boundary zone.
      </div>
    `);
    
    if (layerGroupRef.current) {
      delhiNcrPolygon.addTo(layerGroupRef.current);
    }

    // 2. Render active crop fire locations as flame emojis
    const flameIcon = L.divIcon({
      html: '<div class="fire-flame-emoji" style="font-size: 18px; filter: drop-shadow(0 0 3px rgba(239,68,68,0.6)); text-align: center;">🔥</div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: 'flame-marker-icon'
    });

    fireLocations.forEach(fire => {
      const fireMarker = L.marker([fire.latitude, fire.longitude], { icon: flameIcon });

      fireMarker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 13px; min-width: 130px; padding: 4px 0;">
          <h4 style="margin: 0 0 6px 0; font-weight: 700; color: #EF4444; border-bottom: 1px solid #2d3748; padding-bottom: 4px;">
            🔥 Crop Fire Active
          </h4>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #9ca3af;">Location:</span>
            <span style="font-weight: 600; color: #f9fafb;">${fire.location_name}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #9ca3af;">Lat/Lon:</span>
            <span style="font-weight: 500; color: #9ca3af;">${fire.latitude.toFixed(2)}, ${fire.longitude.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #9ca3af;">Brightness:</span>
            <span style="font-weight: 700; color: #F59E0B;">${fire.brightness} K</span>
          </div>
        </div>
      `);

      if (layerGroupRef.current) {
        fireMarker.addTo(layerGroupRef.current);
      }
    });

    // 3. Draw animated wind vector lines and flowing arrow indicators from Punjab/Haryana NW to Delhi SE
    const windTargetLat = 28.6139;
    const windTargetLon = 77.2090;

    const origins = [
      [30.8, 74.8], // West Punjab origin
      [30.5, 75.7], // Mid Punjab/Haryana origin
      [30.1, 76.5]  // East Haryana origin
    ];

    const arrowIcon = L.divIcon({
      html: '<div class="wind-flowing-arrow" style="font-size: 14px; color: #60A5FA; text-shadow: 0 0 3px rgba(59, 130, 246, 0.7); display: inline-block;">➤</div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: 'wind-arrow-icon'
    });

    origins.forEach((origin) => {
      // Background dashed wind corridor line
      const line = L.polyline([origin, [windTargetLat, windTargetLon]], {
        color: '#3B82F6',
        weight: 1.5,
        dashArray: '10, 15',
        opacity: 0.6
      });
      
      if (layerGroupRef.current) {
        line.addTo(layerGroupRef.current);
        const el = line.getElement();
        if (el) {
          el.classList.add('animated-wind-line');
        }

        // Add 2 intermediate animated arrow markers along the path
        const factors = [0.35, 0.7];
        factors.forEach(f => {
          const arrowLat = origin[0] + f * (windTargetLat - origin[0]);
          const arrowLon = origin[1] + f * (windTargetLon - origin[1]);
          L.marker([arrowLat, arrowLon], { icon: arrowIcon, interactive: false }).addTo(layerGroupRef.current);
        });
      }
    });

    // 4. Add soft state boundary text labels
    const states = [
      { name: "Punjab", coords: [30.9, 75.3] },
      { name: "Haryana", coords: [29.3, 76.1] },
      { name: "Delhi", coords: [28.68, 77.12] },
      { name: "Uttar Pradesh", coords: [28.4, 77.8] },
      { name: "Rajasthan", coords: [27.7, 74.9] }
    ];

    states.forEach(state => {
      const labelIcon = L.divIcon({
        html: `<div style="color: #6B7280; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; opacity: 0.75; text-shadow: 0 0 2px #000;">${state.name}</div>`,
        className: 'state-label-icon',
        iconSize: [100, 20]
      });
      L.marker(state.coords, { icon: labelIcon, interactive: false }).addTo(layerGroupRef.current);
    });

  }, [fireLocations, windDirection, windSpeed]);

  // Clean up map completely on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col bg-cardBg border border-gray-800 rounded-card shadow-cardShadow overflow-hidden w-full h-full">
      <style>{`
        @keyframes windDash {
          to {
            stroke-dashoffset: -25;
          }
        }
        @keyframes windFlow {
          0% {
            transform: translate(0, 0) rotate(145deg);
            opacity: 0.2;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(12px, 15px) rotate(145deg);
            opacity: 0.2;
          }
        }
        .animated-wind-line {
          animation: windDash 2s linear infinite;
        }
        .wind-flowing-arrow {
          animation: windFlow 1.8s linear infinite;
          transform-origin: center;
        }
      `}</style>
      <div className="px-5 py-4 border-b border-gray-800 bg-[#12192c] flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Punjab & Haryana Smoke Corridor Tracker</h3>
          <p className="text-xs text-textSecondary mt-0.5">Real-time VIIRS thermal hotspots mapped with ambient wind vectors</p>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center">
            <span className="mr-1.5 text-sm">🔥</span>
            <span className="text-textSecondary">Crop Fires</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-[#60A5FA] mr-1.5"></span>
            <span className="text-textSecondary">Wind Corridor</span>
          </div>
        </div>
      </div>
      <div className="relative w-full h-[400px] md:h-full z-10" ref={mapRef}></div>
    </div>
  );
}

export default FireMap;
