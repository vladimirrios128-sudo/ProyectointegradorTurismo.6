/**
 * Turismo Inteligente - Colombia
 * Lógica del Mapa Interactivo Leaflet y Cálculo de Rutas
 */

document.addEventListener('DOMContentLoaded', () => {
  // Puntos de referencia emblemáticos de Colombia
  const PLACES_DATA = {
    bogota: { name: 'Bogotá D.C. (Plaza de Bolívar)', lat: 4.5981, lng: -74.0758 },
    cocuy: { name: 'Parque Nacional Natural El Cocuy', lat: 6.4678, lng: -72.3167 },
    nevados: { name: 'Parque Nacional Los Nevados', lat: 4.8922, lng: -75.3194 },
    cartagena: { name: 'Cartagena de Indias (Murallas)', lat: 10.4236, lng: -75.5528 },
    guatape: { name: 'Guatapé (Piedra del Peñol)', lat: 6.2328, lng: -75.1565 },
  };

  let selectedMode = 'vehicle';
  let mapInstance = null;
  let routePolyline = null;
  let markersLayer = null;

  // 1. Inicializar Mapa Leaflet centrado en Colombia
  function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    mapInstance = L.map('map', {
      center: [5.5, -74.0],
      zoom: 6,
      zoomControl: true,
    });

    // Capa de CartoDB Dark Matter para coincidir con la estética premium oscura
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapInstance);

    markersLayer = L.layerGroup().addTo(mapInstance);

    // Añadir marcadores para los puntos clave
    Object.keys(PLACES_DATA).forEach((key) => {
      const p = PLACES_DATA[key];
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background: #E67E22; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(230,126,34,0.8);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([p.lat, p.lng], { icon: customIcon })
        .bindPopup(`<strong style="color: #0c1017;">${p.name}</strong><br><span style="font-size: 11px; color: #64748b;">Punto Turístico Colombia</span>`)
        .addTo(markersLayer);
    });

    // Calcular ruta inicial por defecto
    calculateRoute();
  }

  // 2. Cálculo de Ruta y Distancia
  function calculateRoute() {
    const originKey = document.getElementById('route-origin')?.value || 'bogota';
    const destKey = document.getElementById('route-destination')?.value || 'guatape';

    if (originKey === destKey) {
      if (window.TurismoApp) {
        window.TurismoApp.showRbacAlert('Atención', 'El origen y el destino deben ser diferentes.', true);
      }
      return;
    }

    const p1 = PLACES_DATA[originKey];
    const p2 = PLACES_DATA[destKey];

    if (!p1 || !p2) return;

    // Distancia geodésica aproximada
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const directDist = R * c;

    // Factor de sinuosidad vial de montaña en Colombia
    const roadDist = Math.round(directDist * 1.35 * 10) / 10;

    const speedMap = {
      vehicle: 55, // km/h
      bus: 42,
      walking: 4.5,
    };
    const speed = speedMap[selectedMode] || 50;
    const hours = Math.round((roadDist / speed) * 10) / 10;

    // Actualizar resumen en la UI
    const distEl = document.getElementById('summary-distance');
    const durEl = document.getElementById('summary-duration');
    const modeEl = document.getElementById('summary-mode');

    if (distEl) distEl.textContent = `${roadDist.toLocaleString()} km`;
    if (durEl) durEl.textContent = `${hours} horas`;
    if (modeEl) {
      modeEl.textContent =
        selectedMode === 'vehicle' ? 'Vehículo' : selectedMode === 'bus' ? 'Autobús' : 'Caminata';
    }

    // Trazar línea en el mapa
    if (routePolyline) {
      mapInstance.removeLayer(routePolyline);
    }

    const curvePoints = generateMidCurvedPath([p1.lat, p1.lng], [p2.lat, p2.lng]);

    routePolyline = L.polyline(curvePoints, {
      color: '#E67E22',
      weight: 4,
      opacity: 0.85,
      dashArray: selectedMode === 'walking' ? '6, 8' : null,
    }).addTo(mapInstance);

    mapInstance.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
  }

  // Genera puntos de apoyo para dar realismo a la topografía
  function generateMidCurvedPath(start, end) {
    const midLat = (start[0] + end[0]) / 2 + (Math.random() - 0.5) * 0.15;
    const midLng = (start[1] + end[1]) / 2 + (Math.random() - 0.5) * 0.15;
    return [start, [midLat, midLng], end];
  }

  // 3. Manejo de Botones de Modo de Transporte
  const modeButtons = document.querySelectorAll('.transport-btn');
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMode = btn.getAttribute('data-mode') || 'vehicle';
      calculateRoute();
    });
  });

  // Botón calcular
  const calcBtn = document.getElementById('btn-calculate-route');
  if (calcBtn) {
    calcBtn.addEventListener('click', calculateRoute);
  }

  // Inicializar mapa
  initMap();
});
