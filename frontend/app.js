const API_URL = "http://127.0.0.1:8080/api/v1";
let currentPolylines = [];
let currentMode = "walk";
let activeCategory = "all";
let selectedOrigin = null;
let selectedDest = null;
let markersMap = {};
let userGpsMarker = null;

const places = [
  { id: "catedral_central", name: "Catedral Primada", lat: 4.6000, lng: -74.0720, cat: "Cultura", icon: "fa-church", color: "#eab308", img: "https://images.unsplash.com/photo-1548625361-18512140a7a0?w=600&q=80", temp: "18°C 🌤️", tip: "👟 Calzado cómodo para caminar por el centro histórico." },
  { id: "plaza_bolivar", name: "Plaza de Bolívar", lat: 4.5981, lng: -74.0760, cat: "Cultura", icon: "fa-monument", color: "#f97316", img: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600&q=80", temp: "18°C 🌤️", tip: "📸 Excelente punto fotográfico." },
  { id: "monserrate", name: "Cerro de Monserrate", lat: 4.6058, lng: -74.0554, cat: "Mirador", icon: "fa-mountain", color: "#3b82f6", img: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=600&q=80", temp: "12°C 🥶", tip: "🧥 Llevar abrigo y cortavientos para el frío en la cima." },
  { id: "rocas_suesca", name: "Rocas de Suesca", lat: 5.1051, lng: -73.7981, cat: "Aventura", icon: "fa-hill-rockslide", color: "#84cc16", img: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&q=80", temp: "16°C ☀️", tip: "🧗‍♂️ Bloqueador solar, calzado de agarre e hidratación." },
  { id: "museo_oro", name: "Museo del Oro", lat: 4.6018, lng: -74.0721, cat: "Cultura", icon: "fa-building-columns", color: "#a855f7", img: "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=600&q=80", temp: "18°C 🌤️", tip: "🎫 Entrada gratuita los domingos." },
  { id: "torre_colpatria", name: "Torre Colpatria", lat: 4.6105, lng: -74.0702, cat: "Mirador", icon: "fa-city", color: "#64748b", img: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&q=80", temp: "17°C 🌥️", tip: "🌆 Abierto fines de semana para vista nocturna." },
  { id: "jardin_botanico", name: "Jardín Botánico", lat: 4.6675, lng: -74.1002, cat: "Naturaleza", icon: "fa-leaf", color: "#22c55e", img: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80", temp: "19°C 🌤️", tip: "🌱 Visita recomendada por el Tropicario." },
  { id: "parque_simon_bolivar", name: "Parque Simón Bolívar", lat: 4.6581, lng: -74.0935, cat: "Naturaleza", icon: "fa-tree", color: "#10b981", img: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&q=80", temp: "19°C 🌤️", tip: "🚴 Ideal para pícnic y alquiler de bicicletas." },
  { id: "catedra_sal", name: "Catedral de Sal (Zipaquirá)", lat: 5.0189, lng: -74.0055, cat: "Cercanías", icon: "fa-gem", color: "#06b6d4", img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80", temp: "14°C 🌧️", tip: "👟 La mina es subterránea, zapato cerrado aconsejado." },
  { id: "laguna_guatavita", name: "Laguna de Guatavita", lat: 4.9781, lng: -73.7742, cat: "Cercanías", icon: "fa-water", color: "#0284c7", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80", temp: "13°C 🌫️", tip: "🌧️ Llevar impermeable o capa para lluvia." },
  { id: "mirador_calera", name: "Mirador de La Calera", lat: 4.6738, lng: -73.9805, cat: "Mirador", icon: "fa-binoculars", color: "#6366f1", img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80", temp: "11°C 🥶", tip: "☕ Probar canelazo caliente para el viento nocturno." },
  { id: "andres_carne", name: "Andrés Carne de Res (Chía)", lat: 4.8617, lng: -74.0335, cat: "Cercanías", icon: "fa-utensils", color: "#ec4899", img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80", temp: "17°C 🌤️", tip: "🥩 Reserva previa recomendada fines de semana." }
];

const map = L.map('map', { zoomControl: false }).setView([4.6500, -74.0000], 10);
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('route-section').classList.remove('hidden');
  initInteractiveMap();
});

function initInteractiveMap() {
  places.forEach((p) => {
    const customIcon = L.divIcon({
      className: 'custom-pin-wrapper',
      html: `<div class="custom-pin" style="background-color: ${p.color}; width: 34px; height: 34px;">
              <i class="fa-solid ${p.icon} text-sm"></i>
             </div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([p.lat, p.lng], { icon: customIcon }).addTo(map);
    
    const popupContent = `
      <div class="p-1 font-sans text-slate-900 w-44">
        <img src="${p.img}" class="w-full h-20 object-cover rounded mb-1">
        <strong class="text-xs block leading-tight">${p.name}</strong>
        <span class="inline-block bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded mb-2">${p.cat}</span>
        <div class="grid grid-cols-2 gap-1 pt-1 border-t border-slate-200">
          <button onclick="selectAsOrigin('${p.id}')" class="bg-emerald-600 text-white text-[9px] font-bold py-1 px-1 rounded hover:bg-emerald-700">Origen</button>
          <button onclick="selectAsDest('${p.id}')" class="bg-rose-600 text-white text-[9px] font-bold py-1 px-1 rounded hover:bg-rose-700">Destino</button>
        </div>
      </div>
    `;
    marker.bindPopup(popupContent);
    markersMap[p.id] = marker;
  });

  renderFilteredDropdowns();
  selectAsOrigin('catedral_central');
  selectAsDest('monserrate');
}

// Filtro por Categorías
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.cat-btn').forEach(b => {
      b.classList.remove('bg-orange-500/20', 'border-orange-500', 'text-orange-300', 'font-bold');
      b.classList.add('bg-slate-950', 'border-slate-800', 'text-slate-400');
    });
    const target = e.currentTarget;
    target.classList.remove('bg-slate-950', 'border-slate-800', 'text-slate-400');
    target.classList.add('bg-orange-500/20', 'border-orange-500', 'text-orange-300', 'font-bold');
    
    activeCategory = target.getAttribute('data-cat');
    renderFilteredDropdowns();
  });
});

function renderFilteredDropdowns() {
  buildDropdown('origin-dropdown', (place) => selectAsOrigin(place.id));
  buildDropdown('dest-dropdown', (place) => selectAsDest(place.id));
}

function buildDropdown(containerId, onSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  const filteredList = activeCategory === 'all' 
    ? places 
    : places.filter(p => p.cat === activeCategory);

  filteredList.forEach(p => {
    const item = document.createElement('div');
    item.className = 'p-2 hover:bg-slate-800 cursor-pointer flex items-center gap-2.5 text-xs border-b border-slate-900/50 transition';
    item.innerHTML = `
      <img src="${p.img}" class="w-8 h-8 rounded-lg object-cover flex-shrink-0">
      <div class="overflow-hidden">
        <div class="font-bold text-slate-200 truncate">${p.name}</div>
        <div class="text-[10px] text-slate-400">${p.cat}</div>
      </div>
    `;
    item.onclick = (e) => {
      e.stopPropagation();
      onSelect(p);
      container.classList.add('hidden');
    };
    container.appendChild(item);
  });
}

// Botón GPS
document.getElementById('gps-btn').addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      
      const myLocation = { id: "user_gps", name: "Mi Ubicación (GPS)", lat, lng, cat: "GPS", img: "", temp: "", tip: "" };
      
      if (userGpsMarker) map.removeLayer(userGpsMarker);
      userGpsMarker = L.marker([lat, lng]).addTo(map).bindPopup("<b>📍 Tu Ubicación Actual</b>").openPopup();
      
      selectedOrigin = myLocation;
      document.getElementById('origin-display').value = "Mi Ubicación (GPS)";
      map.setView([lat, lng], 13);
    }, () => alert("Permiso de ubicación no concedido."));
  }
});

const originTrigger = document.getElementById('origin-trigger');
const originDropdown = document.getElementById('origin-dropdown');
const destTrigger = document.getElementById('dest-trigger');
const destDropdown = document.getElementById('dest-dropdown');

originTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  destDropdown.classList.add('hidden');
  originDropdown.classList.toggle('hidden');
});

destTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  originDropdown.classList.add('hidden');
  destDropdown.classList.toggle('hidden');
});

document.addEventListener('click', () => {
  originDropdown.classList.add('hidden');
  destDropdown.classList.add('hidden');
});

window.selectAsOrigin = function(placeId) {
  const p = typeof placeId === 'string' ? places.find(x => x.id === placeId) : placeId;
  selectedOrigin = p;
  document.getElementById('origin-display').value = p.name;
};

window.selectAsDest = function(placeId) {
  const p = typeof placeId === 'string' ? places.find(x => x.id === placeId) : placeId;
  selectedDest = p;
  document.getElementById('dest-display').value = p.name;
};

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.remove('border-orange-500/50', 'bg-orange-500/10', 'text-orange-300', 'font-bold');
      b.classList.add('border-slate-800', 'text-slate-400');
    });
    const target = e.currentTarget;
    target.classList.remove('border-slate-800', 'text-slate-400');
    target.classList.add('border-orange-500/50', 'bg-orange-500/10', 'text-orange-300', 'font-bold');
    currentMode = target.getAttribute('data-mode');
  });
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// Calcular Trayecto
document.getElementById('calc-btn').addEventListener('click', () => {
  if (!selectedOrigin || !selectedDest) {
    alert("Selecciona un origen y un destino.");
    return;
  }

  if (selectedOrigin.id === selectedDest.id) {
    alert("Elige un origen y un destino diferentes.");
    return;
  }

  const baseDist = parseFloat(calculateDistance(selectedOrigin.lat, selectedOrigin.lng, selectedDest.lat, selectedDest.lng).toFixed(1));
  let speed = currentMode === 'walk' ? 4.5 : (currentMode === 'bike' ? 15 : 40);

  const availableRoutes = [
    { id: 'main', name: 'Ruta Principal', tag: 'Rápida', dist: baseDist, time: Math.max(5, Math.round((baseDist / speed) * 60)), color: '#f97316', offsetLat: 0, offsetLng: 0 },
    { id: 'scenic', name: 'Ruta Panorámica', tag: 'Turística', dist: parseFloat((baseDist * 1.25).toFixed(1)), time: Math.max(8, Math.round(((baseDist * 1.25) / speed) * 60)), color: '#3b82f6', offsetLat: 0.008, offsetLng: -0.006 },
    { id: 'alt', name: 'Vía Secundaria', tag: 'Alterna', dist: parseFloat((baseDist * 1.12).toFixed(1)), time: Math.max(6, Math.round(((baseDist * 1.12) / speed) * 60)), color: '#10b981', offsetLat: -0.006, offsetLng: 0.008 }
  ];

  currentPolylines.forEach(p => map.removeLayer(p));
  currentPolylines = [];

  const routesListContainer = document.getElementById('routes-list');
  routesListContainer.innerHTML = '';

  availableRoutes.forEach((route, index) => {
    const midLat = (selectedOrigin.lat + selectedDest.lat) / 2 + route.offsetLat;
    const midLng = (selectedOrigin.lng + selectedDest.lng) / 2 + route.offsetLng;
    const waypoints = [[selectedOrigin.lat, selectedOrigin.lng], [midLat, midLng], [selectedDest.lat, selectedDest.lng]];

    const polyline = L.polyline(waypoints, {
      color: route.color,
      weight: index === 0 ? 5 : 3,
      opacity: index === 0 ? 0.9 : 0.6,
      dashArray: index === 0 ? '0' : '6, 6'
    }).addTo(map);

    currentPolylines.push(polyline);

    const routeCard = document.createElement('div');
    routeCard.className = `p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
      index === 0 ? 'border-orange-500 bg-orange-500/10 text-orange-200' : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800'
    }`;
    
    routeCard.innerHTML = `
      <div>
        <div class="font-bold text-xs flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${route.color}"></span>
          ${route.name}
        </div>
        <div class="text-[10px] text-slate-400 mt-0.5">${route.tag} • ${route.dist} km</div>
      </div>
      <div class="text-right">
        <span class="text-xs font-black text-slate-200">${route.time} min</span>
      </div>
    `;

    routeCard.onclick = () => {
      currentPolylines.forEach((p, idx) => {
        p.setStyle({ weight: idx === index ? 6 : 3, opacity: idx === index ? 1 : 0.3 });
      });
      document.querySelectorAll('#routes-list > div').forEach(card => {
        card.classList.remove('border-orange-500', 'bg-orange-500/10', 'text-orange-200');
        card.classList.add('border-slate-800', 'bg-slate-950/60', 'text-slate-400');
      });
      routeCard.classList.remove('border-slate-800', 'bg-slate-950/60', 'text-slate-400');
      routeCard.classList.add('border-orange-500', 'bg-orange-500/10', 'text-orange-300');
    };

    routesListContainer.appendChild(routeCard);
  });

  const bounds = L.latLngBounds([selectedOrigin.lat, selectedOrigin.lng], [selectedDest.lat, selectedDest.lng]);
  map.fitBounds(bounds, { padding: [60, 60] });

  document.getElementById('route-result').classList.remove('hidden');
  document.getElementById('dest-img').src = selectedDest.img;
  document.getElementById('dest-img-title').innerText = selectedDest.name;
  document.getElementById('weather-badge').innerHTML = `<i class="fa-solid fa-temperature-three-quarters"></i> Clima: ${selectedDest.temp}`;

  document.getElementById('travel-tips').innerHTML = `
    <div class="font-bold text-orange-300 mb-1 flex items-center gap-1">
      <i class="fa-solid fa-lightbulb"></i> Recomendación del Destino:
    </div>
    <p class="text-slate-300 text-[11px]">${selectedDest.tip}</p>
  `;
});