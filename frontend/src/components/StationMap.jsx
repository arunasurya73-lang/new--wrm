import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

function StationMap({ stations }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerGroupRef = useRef(null);

  // CPCB AQI Color Mapping
  const getMarkerColor = (aqi) => {
    if (aqi < 100) return '#10B981'; // Green
    if (aqi <= 200) return '#F59E0B'; // Yellow
    if (aqi <= 300) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  // Dynamic popup advice based on AQI
  const getOneLineAdvice = (aqi) => {
    if (aqi < 100) return "Air quality is satisfactory. Safe to go out.";
    if (aqi <= 200) return "Moderate pollution. Sensitive groups should wear masks.";
    if (aqi <= 300) return "Poor air quality. Limit outdoor activities.";
    return "Hazardous air. Avoid outdoor activity.";
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize Leaflet map
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [28.6139, 77.2090], // Center on Delhi
        zoom: 10, // Zoom level 10 (shows Delhi NCR clearly)
        minZoom: 3, // Enable full zoom out to see India
        maxZoom: 18,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true
      });

      // Add CartoDB Dark Matter tiles with required attribution
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
        keepBuffer: 4,
        updateWhenIdle: false,
        updateWhenZooming: false
      }).addTo(mapInstance.current);

      // Draw a subtle Delhi NCR boundary box inline — no external network dependency
      const delhiNCRBounds = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [76.84, 28.40], [77.55, 28.40],
            [77.55, 28.88], [76.84, 28.88],
            [76.84, 28.40]
          ]]
        }
      };
      L.geoJSON(delhiNCRBounds, {
        style: {
          color: '#374151',
          weight: 1.5,
          fillColor: 'transparent',
          fillOpacity: 0,
          dashArray: '4 4'
        },
        interactive: false
      }).addTo(mapInstance.current);

      markerGroupRef.current = L.layerGroup().addTo(mapInstance.current);
    }

    // Clear old markers
    if (markerGroupRef.current) {
      markerGroupRef.current.clearLayers();
    }

    // Place circle markers for each station
    stations.forEach(station => {
      const circleColor = getMarkerColor(station.aqi_value);
      const adviceLine = getOneLineAdvice(station.aqi_value);
      
      const marker = L.circleMarker([station.latitude, station.longitude], {
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.65,
        weight: 2.5,
        radius: 13
      });

      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 13px; min-width: 160px; padding: 4px 0;">
          <h4 style="margin: 0 0 6px 0; font-weight: 700; color: #ffffff; border-bottom: 1px solid #2d3748; padding-bottom: 4px;">
            ${station.station_name}
          </h4>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #9ca3af;">Current AQI:</span>
            <span style="font-weight: 700; color: ${circleColor};">${station.aqi_value}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #9ca3af;">PM2.5:</span>
            <span style="font-weight: 600; color: #f9fafb;">${station.pm25} µg/m³</span>
          </div>
          <div style="border-top: 1px dashed #2d3748; padding-top: 6px; font-style: italic; color: #cbd5e1; font-size: 11px; line-height: 1.3;">
            "${adviceLine}"
          </div>
        </div>
      `, {
        className: 'custom-leaflet-popup'
      });

      if (markerGroupRef.current) {
        marker.addTo(markerGroupRef.current);
      }
    });

  }, [stations]);

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
    <div className="flex flex-col bg-cardBg border border-gray-800 rounded-card shadow-cardShadow overflow-hidden w-full">
      <div className="px-5 py-4 border-b border-gray-800 bg-[#12192c]">
        <h3 className="text-base font-semibold text-white">Delhi NCR Station Monitoring Network</h3>
        <p className="text-xs text-textSecondary mt-0.5">Real-time local monitoring stations across the capital basin</p>
      </div>
      <div className="relative w-full h-[320px] md:h-[400px] z-10" ref={mapRef}></div>
    </div>
  );
}

export default StationMap;
