let map = null;
let currentTransport = 'driving';
let currentCategory = 'All';
let currentPolyline = null;
let selectedPlace = null;
let originMarker = null;

let favoritesList = JSON.parse(localStorage.getItem('fav_places') || '[]');
let currentOrigin = { lat: 4.5981, lng: -74.0758, name: "Bogotá - Centro" };

const touristPlaces = [
    { id: 1, name: "Parque Nacional Natural El Cocuy", lat: 6.4000, lng: -72.3000, desc: "La masa glaciar más grande de Colombia con más de 25 picos nevados.", category: "Aventura", img: "https://upload.wikimedia.org/wikipedia/commons/e/e3/PNN_El_Cocuy.jpg", busInfo: "Buses a El Cocuy (~$70.000 COP)", funFact: "Posee la masa continua de nieve e hielo más grande de los Andes septentrionales." },
    { id: 2, name: "Parque Nacional Natural Los Nevados (Ruiz)", lat: 4.8920, lng: -75.3188, desc: "Estratovolcán nevado y ecosistemas de páramo.", category: "Naturaleza", img: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Nevado_del_Ruiz_volcano.jpg", busInfo: "Tours autorizados desde Manizales", funFact: "Sus frailejones crecen solo 1 cm por año." },
    { id: 3, name: "Laguna de Tota", lat: 5.5458, lng: -72.9213, desc: "El lago más grande de Colombia con su famosa Playa Blanca a 3.015 msnm.", category: "Naturaleza", img: "https://upload.wikimedia.org/wikipedia/commons/d/da/Laguna_de_tota-_Boyac%C3%A1_Colombia.jpg", busInfo: "Buses desde Sogamoso (~$8.000 COP)", funFact: "Alberga la playa de agua dulce a mayor altitud de América del Sur." },
    { id: 4, name: "Rocas de Suesca", lat: 5.1053, lng: -73.8011, desc: "Escalada deportiva y farallones rocosos icónicos.", category: "Aventura", img: "https://upload.wikimedia.org/wikipedia/commons/2/23/Rocas_de_Suesca.JPG", busInfo: "Flotas desde Portal Norte (~$12.000 COP)", funFact: "Es considerada la cuna de la escalada en roca en Colombia." }
];

// --- 📡 FUNCIÓN DE GEOLOCALIZACIÓN GPS ---
function getGPSLocation() {
    const btn = document.getElementById('btn-gps');
    const btnText = document.getElementById('gps-btn-text');
    const gpsIcon = document.getElementById('gps-icon');
    const statusEl = document.getElementById('origin-status');
    const inputEl = document.getElementById('origin-search');

    if (!navigator.geolocation) {
        alert("Tu navegador no soporta geolocalización GPS.");
        statusEl.innerText = "❌ Tu navegador no soporta GPS.";
        return;
    }

    // Estado visual de carga
    btn.disabled = true;
    if (btnText) btnText.innerText = "Obteniendo...";
    if (gpsIcon) gpsIcon.classList.add('spin-icon');
    statusEl.innerText = "📡 Consultando GPS del dispositivo...";

    const geoOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            statusEl.innerText = "📍 Posición GPS obtenida. Buscando dirección...";

            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                    headers: { 'Accept-Language': 'es-CO,es;q=0.9' }
                });
                const data = await response.json();

                let addressName = "Mi Ubicación GPS";
                if (data && data.address) {
                    const a = data.address;
                    addressName = a.road || a.suburb || a.neighbourhood || a.city_district || a.city || "Ubicación GPS";
                }

                // Poner el resultado en el campo de texto
                inputEl.value = addressName;
                statusEl.innerText = `📍 Origen actual: ${addressName}`;

                currentOrigin = { lat, lng, name: addressName };
                onOriginLocationUpdated(lat, lng, addressName);

            } catch (err) {
                console.error("Error Nominatim:", err);
                inputEl.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                statusEl.innerText = `📍 Origen: (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                currentOrigin = { lat, lng, name: "Ubicación GPS" };

                onOriginLocationUpdated(lat, lng, "Ubicación GPS");
            } finally {
                resetGPSButton();
            }
        },
        (error) => {
            console.error("Error GPS:", error);
            resetGPSButton();

            if (error.code === error.PERMISSION_DENIED) {
                alert("Debes presionar 'Permitir' en la solicitud emergente de ubicación de tu navegador.");
                statusEl.innerText = "⚠️ Permiso GPS denegado.";
            } else {
                statusEl.innerText = "⚠️️ No se pudo obtener la señal GPS.";
            }
        },
        geoOptions
    );
}

function resetGPSButton() {
    const btn = document.getElementById('btn-gps');
    const btnText = document.getElementById('gps-btn-text');
    const gpsIcon = document.getElementById('gps-icon');

    btn.disabled = false;
    if (btnText) btnText.innerText = "Mi Ubicación";
    if (gpsIcon) gpsIcon.classList.remove('spin-icon');
}

// Hook de actualización en el mapa
function onOriginLocationUpdated(lat, lng, label) {
    if (originMarker) {
        originMarker.setLatLng([lat, lng]);
        originMarker.bindPopup(`<b>Tu Origen:</b><br>${label}`).openPopup();
    } else {
        originMarker = L.marker([lat, lng]).addTo(map).bindPopup(`<b>Tu Origen:</b><br>${label}`).openPopup();
    }

    map.setView([lat, lng], 14);

    if (selectedPlace) {
        calculateRoute(selectedPlace);
    }
}

function searchOriginNominatim(e) { 
    if (e.key === 'Enter') triggerOriginSearch(); 
}

async function triggerOriginSearch() {
    const rawQuery = document.getElementById('origin-search').value.trim();
    if (!rawQuery) return;

    document.getElementById('origin-status').innerText = "🔍 Buscando dirección...";
    let cleanedQuery = rawQuery.replace(/#/g, ' No. ').replace(/-/g, ' ');
    const bogotaViewbox = "-74.25,4.45,-74.00,4.85";

    let searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanedQuery + ", Bogotá, Colombia")}&bounded=1&viewbox=${bogotaViewbox}&addressdetails=1&limit=5`;

    try {
        let response = await fetch(searchUrl, { headers: { 'Accept-Language': 'es-CO,es;q=0.9' } });
        let data = await response.json();

        if (!data || data.length === 0) {
            const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanedQuery + ", Colombia")}&addressdetails=1&limit=5`;
            response = await fetch(fallbackUrl, { headers: { 'Accept-Language': 'es-CO,es;q=0.9' } });
            data = await response.json();
        }

        if (data && data.length > 0) {
            const firstMatch = data[0];
            const lat = parseFloat(firstMatch.lat);
            const lng = parseFloat(firstMatch.lon);

            const addr = firstMatch.address || {};
            const friendlyName = addr.road || addr.suburb || addr.neighbourhood || addr.city_district || firstMatch.display_name.split(',')[0];

            currentOrigin = { lat: lat, lng: lng, name: `${friendlyName} (${rawQuery})` };
            document.getElementById('origin-status').innerText = `📍 Origen: ${friendlyName}`;

            onOriginLocationUpdated(lat, lng, friendlyName);
        } else {
            document.getElementById('origin-status').innerText = "⚠️ Dirección no encontrada.";
        }
    } catch (err) {
        console.error(err);
        document.getElementById('origin-status').innerText = "❌ Error al buscar dirección.";
    }
}

async function fetchWeather(lat, lng) {
    const weatherCard = document.getElementById('weather-card');
    weatherCard.classList.remove('hidden');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=precipitation_probability`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.current_weather) {
            const temp = Math.round(data.current_weather.temperature);
            const rainProb = data.hourly?.precipitation_probability?.[0] || 10;
            document.getElementById('weather-temp').innerText = `${temp}°C`;
            document.getElementById('weather-rain').innerText = `${rainProb}%`;
            document.getElementById('weather-desc').innerText = "Parcialmente nublado";
        }
    } catch (err) { console.error(err); }
}

async function calculateRoute(place) {
    selectedPlace = place;
    document.getElementById('route-info').classList.remove('hidden');
    fetchWeather(place.lat, place.lng);

    document.getElementById('fun-fact-card').classList.remove('hidden');
    document.getElementById('fun-fact-text').innerText = place.funFact;
    document.getElementById('route-dest-name').innerText = place.name;

    const url = `https://router.project-osrm.org/route/v1/driving/${currentOrigin.lng},${currentOrigin.lat};${place.lng},${place.lat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            document.getElementById('route-distance').innerText = `${(route.distance / 1000).toFixed(1)} km`;
            document.getElementById('route-time').innerText = `${Math.round(route.duration / 60)} min`;
            document.getElementById('route-transport-info').innerHTML = `<i class="fa-solid fa-circle-info mr-1"></i> ${place.busInfo}`;

            const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            if (currentPolyline) map.removeLayer(currentPolyline);
            currentPolyline = L.polyline(coordinates, { color: '#f59e0b', weight: 5 }).addTo(map);
            map.fitBounds(currentPolyline.getBounds(), { padding: [50, 50] });
        }
    } catch (error) { console.error(error); }
}

function renderPlacesList() {
    const listContainer = document.getElementById('places-list');
    const searchVal = document.getElementById('search-input').value.toLowerCase();
    listContainer.innerHTML = '';

    const filtered = touristPlaces.filter(p => {
        const isFav = favoritesList.includes(p.name);
        const matchesCat = currentCategory === 'All' || (currentCategory === 'Favs' && isFav) || p.category === currentCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchVal) || p.desc.toLowerCase().includes(searchVal);
        return matchesCat && matchesSearch;
    });

    filtered.forEach(place => {
        const isFav = favoritesList.includes(place.name);
        const heartClass = isFav ? "fa-solid fa-heart text-red-500" : "fa-regular fa-heart text-slate-400 hover:text-red-400";

        const item = document.createElement('div');
        item.className = "p-2.5 bg-slate-950/90 hover:bg-slate-800/90 border border-slate-800/80 rounded-xl cursor-pointer transition-all flex gap-3 items-center";
        item.onclick = () => calculateRoute(place);
        item.innerHTML = `
            <img src="${place.img}" alt="${place.name}" class="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-slate-800">
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start mb-0.5">
                    <h3 class="font-bold text-xs text-white truncate">${place.name}</h3>
                    <button onclick="toggleFavorite(event, '${place.name}')" class="p-1 text-xs cursor-pointer">
                        <i class="${heartClass}"></i>
                    </button>
                </div>
                <span class="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-semibold inline-block mb-1">${place.category}</span>
                <p class="text-[10px] text-slate-400 line-clamp-2">${place.desc}</p>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

function initMap() {
    if (!map) {
        map = L.map('map').setView([4.8500, -73.9500], 6);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        originMarker = L.marker([currentOrigin.lat, currentOrigin.lng]).addTo(map);

        touristPlaces.forEach((place, idx) => {
            const marker = L.marker([place.lat, place.lng]).addTo(map);
            marker.bindPopup(`
                <div style="color: #0f172a; font-family: sans-serif; max-width: 200px;">
                    <img src="${place.img}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 6px; margin-bottom: 6px;">
                    <b style="font-size: 13px; color: #d97706;">${place.name}</b><br>
                    <button onclick="calculateRoute(touristPlaces[${idx}])" style="background-color: #f59e0b; color: #020617; border: none; padding: 5px 8px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 5px; width: 100%; font-size: 11px;">Ver Ruta y Clima</button>
                </div>
            `);
        });
    }
}

// Inicializar al cargar
window.onload = function() {
    initMap();
    renderPlacesList();
};

function filterCategory(cat) { currentCategory = cat; renderPlacesList(); }
function filterPlaces() { renderPlacesList(); }
function setTransport(type) { currentTransport = type; if (selectedPlace) calculateRoute(selectedPlace); }
function openClientMenuModal() { document.getElementById('client-menu-modal').classList.remove('hidden'); }
function closeClientMenuModal() { document.getElementById('client-menu-modal').classList.add('hidden'); }