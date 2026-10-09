document.addEventListener('DOMContentLoaded', () => {
    // Definición de Roles
    const roleLabels = {
        'tourist': 'Turista',
        'merchant': 'Admin Comercio',
        'super_admin': 'Super Admin',
        'auditor': 'Auditor'
    };

    let savedRole = localStorage.getItem('userRole') || 'merchant';
    const savedEmail = localStorage.getItem('userEmail') || 'Usuario';
    let userName = savedEmail.includes('@') ? savedEmail.split('@')[0] : savedEmail;
    const formattedRole = roleLabels[savedRole] || savedRole;

    const headerActions = document.getElementById('headerActions');
    if (headerActions) {
        let panelButtonHtml = '';
        if (savedRole === 'merchant') {
            panelButtonHtml = `<a href="merchant.html" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs shadow-md">🏪 Panel de Comercio</a>`;
        } else if (savedRole === 'super_admin' || savedRole === 'auditor') {
            panelButtonHtml = `<a href="admin.html" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs shadow-md">📊 Dashboard Global</a>`;
        }

        headerActions.innerHTML = `
            ${panelButtonHtml}
            <span id="userBadge" class="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-full text-amber-400 font-medium shadow-inner flex items-center gap-1.5 text-xs">
                👤 <span class="text-amber-400 font-bold">${formattedRole}:</span> <span class="text-white font-medium">${userName}</span>
            </span>
            <button id="btnLogout" class="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-full font-medium transition-all duration-200 text-xs active:scale-95">
                🚪 Salir
            </button>
        `;

        document.getElementById('btnLogout').addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }

    // CAPAS 100% GRATUITAS Y SIN API KEY
    const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors' 
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
        attribution: '&copy; Esri World Imagery' 
    });

    const map = L.map('map', {
        center: [4.5709, -74.2973],
        zoom: 6,
        layers: [osmLayer]
    });

    const baseMaps = {
        "🗺️ Mapa Estándar": osmLayer,
        "🛰 Satelital": satelliteLayer
    };

    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

    let routingControl = null;
    let poiMarkersGroup = L.layerGroup().addTo(map);
    let elevationChartInstance = null;
    let userCurrentLocation = { lat: 4.6097, lng: -74.0817 };
    let userMarker = null;
    let selectedCategory = 'todos';
    let favoritesList = JSON.parse(localStorage.getItem('userFavorites') || '[]');

    // LISTA DE DESTINOS
    const places = [
        {
            id: 'cocuy',
            name: "Parque Nacional Natural El Cocuy",
            category: "Aventura",
            lat: 6.4000,
            lng: -72.3333,
            desc: "La masa glaciar más grande de Colombia con más de 25 picos nevados.",
            image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=300&q=80",
            fact: "Posee la masa continua de nieve e hielo más grande de los Andes septentrionales.",
            busCost: "$70.000 COP",
            elevationProfile: [2750, 3200, 3800, 4500, 4800, 5060],
            pois: [
                { type: "toll", name: "Peaje Andes (Chía)", lat: 4.8621, lng: -74.0322, details: "Costo Aprox: $11.600 COP" },
                { type: "toll", name: "Peaje El Roble", lat: 5.0933, lng: -73.8111, details: "Costo Aprox: $10.800 COP" },
                { type: "gas", name: "Estación Terpel Duitama", lat: 5.8245, lng: -73.0311, details: "Gasolina / Diesel / Electrolinera" },
                { type: "food", name: "Restaurante Parador Boyacense", lat: 5.4510, lng: -73.3620, details: "Especialidad en Arepa Boyacense" },
                { type: "police", name: "CAI de Policía Soatá", lat: 6.2100, lng: -72.6800, details: "Atención Vial 24h & Emergencias" }
            ]
        },
        {
            id: 'nevados',
            name: "Parque Nacional Natural Los Nevados (Ruiz)",
            category: "Naturaleza",
            lat: 4.8022,
            lng: -75.3678,
            desc: "Estratovolcán nevado y ecosistemas de páramo.",
            image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80",
            fact: "Hogar del cóndor de los Andes y frailejones centenarios.",
            busCost: "$55.000 COP",
            elevationProfile: [2150, 2800, 3400, 4100, 4850, 5321],
            pois: [
                { type: "toll", name: "Peaje Chusacá / La Esperanza", lat: 4.5122, lng: -74.2511, details: "Costo Aprox: $12.500 COP" },
                { type: "gas", name: "Estación Texaco Facatativá", lat: 4.8100, lng: -74.3500, details: "Servicios de aire y combustible" },
                { type: "food", name: "Parador Frutería Cambao", lat: 4.9500, lng: -74.7500, details: "Bebidas frías y amasijos tradicionales" },
                { type: "police", name: "Puesto de Control Vial Manizales", lat: 5.0680, lng: -75.5170, details: "Asistencia Mecánica Carretera" }
            ]
        },
        {
            id: 'tota',
            name: "Laguna de Tota",
            category: "Naturaleza",
            lat: 5.5486,
            lng: -72.9233,
            desc: "El lago más grande de Colombia con su famosa Playa Blanca a 3.015 msnm.",
            image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80",
            fact: "Es el segundo lago navegable a mayor altitud de toda Sudamérica.",
            busCost: "$45.000 COP",
            elevationProfile: [2600, 2750, 2900, 3015],
            pois: [
                { type: "toll", name: "Peaje Albarracín", lat: 5.1200, lng: -73.6500, details: "Costo Aprox: $10.200 COP" },
                { type: "gas", name: "Primax Tunja Norte", lat: 5.5350, lng: -73.3580, details: "Tienda 24 horas y electrolinera" },
                { type: "food", name: "Restaurante Truchas La Cabaña", lat: 5.5500, lng: -72.9300, details: "Plato Típico: Trucha Arcoíris" }
            ]
        },
        {
            id: 'suesca',
            name: "Rocas de Suesca",
            category: "Aventura",
            lat: 5.1044,
            lng: -73.8003,
            desc: "Escalada deportiva y farallones rocosos icónicos.",
            image: "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=300&q=80",
            fact: "Considerada la cuna de la escalada en roca en Colombia con más de 400 rutas abiertas.",
            busCost: "$15.000 COP",
            elevationProfile: [2580, 2600, 2650, 2700],
            pois: [
                { type: "toll", name: "Peaje Andes / Fusca", lat: 4.8500, lng: -74.0300, details: "Costo Aprox: $11.600 COP" },
                { type: "gas", name: "Terpel La Caro", lat: 4.8200, lng: -74.0200, details: "Estación de servicio integral" },
                { type: "food", name: "Café del Escalador Suesca", lat: 5.1010, lng: -73.7990, details: "Café de origen y sandwiches" }
            ]
        },
        {
            id: 'cristales',
            name: "Caño Cristales (La Macarena, Meta)",
            category: "Naturaleza",
            lat: 2.2600,
            lng: -73.7900,
            desc: "El río más hermoso del mundo con sus mágicas algas rojas y multicolores.",
            image: "https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&w=300&q=80",
            fact: "El color rojo proviene de la planta acuática endémica Macarenia clavigera.",
            busCost: "Vuelo / $180.000 COP",
            elevationProfile: [350, 280, 220, 208],
            pois: [
                { type: "gas", name: "Estación de Servicio La Macarena", lat: 2.2580, lng: -73.7850, details: "Combustible local" },
                { type: "food", name: "Parador Turístico Los Goyos", lat: 2.2590, lng: -73.7880, details: "Comida típica llanera" },
                { type: "police", name: "Estación de Policía La Macarena", lat: 2.2610, lng: -73.7910, details: "Seguridad y orientación turística" }
            ]
        }
    ];

    const placesList = document.getElementById('placesList');
    const searchInput = document.getElementById('searchInput');

    function applyFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = places.filter(place => {
            const matchesText = place.name.toLowerCase().includes(query) ||
                                place.category.toLowerCase().includes(query) ||
                                place.desc.toLowerCase().includes(query);

            let matchesCategory = true;
            if (selectedCategory === 'favoritos') {
                matchesCategory = favoritesList.includes(place.name);
            } else if (selectedCategory !== 'todos') {
                matchesCategory = place.category.toLowerCase() === selectedCategory.toLowerCase();
            }

            return matchesText && matchesCategory;
        });

        renderPlaces(filtered);
    }

    function renderPlaces(items) {
        if (!placesList) return;
        placesList.innerHTML = '';
        poiMarkersGroup.clearLayers();

        if (items.length === 0) {
            placesList.innerHTML = `<div class="text-center text-slate-500 py-8 text-xs">No se encontraron destinos en esta categoría.</div>`;
            return;
        }

        items.forEach(place => {
            const isFav = favoritesList.includes(place.name);
            const card = document.createElement('div');
            
            card.className = "bg-slate-950/90 border border-slate-800/80 p-3.5 rounded-2xl hover:border-amber-500/40 transition cursor-pointer shadow-xl flex gap-3 relative group";
            
            card.innerHTML = `
                <div class="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
                    <img src="${place.image}" alt="${place.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                </div>

                <div class="flex-1 min-w-0 pr-6 space-y-1">
                    <div class="flex justify-between items-start">
                        <h3 class="text-xs font-bold text-white truncate pr-2" title="${place.name}">${place.name}</h3>
                    </div>
                    
                    <div>
                        <span class="inline-block text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded uppercase font-semibold">
                            ${place.category}
                        </span>
                    </div>

                    <p class="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">${place.desc}</p>
                    
                    <button class="w-full text-[10px] bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold py-1.5 px-2 rounded-lg transition mt-1.5 flex items-center justify-center gap-1 border border-slate-700/50" onclick="calculateRoute('${place.id}')">
                        🚗 Trazar Ruta e Inspeccionar
                    </button>
                </div>

                <button onclick="toggleFavorite('${place.name}')" class="absolute top-3.5 right-3.5 text-slate-400 hover:text-rose-500 transition text-sm focus:outline-none" title="${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                    ${isFav ? '<span class="text-rose-500">♥</span>' : '♡'}
                </button>
            `;

            const marker = L.marker([place.lat, place.lng]).addTo(map);
            marker.bindPopup(`<b>${place.name}</b><br><span class="text-xs">${place.desc}</span>`);

            placesList.appendChild(card);
        });
    }

    // Consulta de Clima
    async function fetchRealWeather(lat, lng) {
        try {
            const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=demo&units=metric&lang=es`);
            if (!res.ok) throw new Error("Fallback local");
            const data = await res.json();
            return {
                temp: `${Math.round(data.main.temp)}°C`,
                sky: data.weather[0].description,
                rainProb: `${data.clouds.all}%`
            };
        } catch {
            return { temp: "14°C", sky: "Parcialmente nublado", rainProb: "25%" };
        }
    }

    // CALCULAR RUTA Y RENDEREAR
    window.calculateRoute = async (placeId) => {
        const place = places.find(p => p.id === placeId);
        if (!place) return;

        if (routingControl) map.removeControl(routingControl);
        poiMarkersGroup.clearLayers();

        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(userCurrentLocation.lat, userCurrentLocation.lng),
                L.latLng(place.lat, place.lng)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            show: false,
            lineOptions: { styles: [{ color: '#f59e0b', weight: 5 }] }
        }).addTo(map);

        // POIs
        const poiIcons = { toll: "🛑", gas: "⛽", food: "🍲", police: "🚔" };

        if (place.pois && place.pois.length > 0) {
            place.pois.forEach(poi => {
                const iconHtml = `<div class="bg-slate-900 border border-amber-500 rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-lg">${poiIcons[poi.type] || '📍'}</div>`;
                const customIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [28, 28] });
                
                L.marker([poi.lat, poi.lng], { icon: customIcon })
                 .addTo(poiMarkersGroup)
                 .bindPopup(`<b>${poiIcons[poi.type] || ''} ${poi.name}</b><br><span class="text-xs text-slate-300">${poi.details}</span>`);
            });
        }

        const weather = await fetchRealWeather(place.lat, place.lng);

        routingControl.on('routesfound', (e) => {
            const routes = e.routes;
            const summary = routes[0].summary;
            const distanceKm = (summary.totalDistance / 1000).toFixed(1);
            const timeMin = Math.round(summary.totalTime / 60);

            renderRouteDetailsPanel(place, distanceKm, timeMin, weather);
        });

        renderRouteDetailsPanel(place, "396.3", "493", weather);

        map.fitBounds([
            [userCurrentLocation.lat, userCurrentLocation.lng],
            [place.lat, place.lng]
        ]);
    };

    function renderRouteDetailsPanel(place, distanceKm, timeMin, weather) {
        if (!placesList) return;

        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userCurrentLocation.lat},${userCurrentLocation.lng}&destination=${place.lat},${place.lng}&travelmode=driving`;
        const wazeUrl = `https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`;

        let poisHtml = '';
        if (place.pois && place.pois.length > 0) {
            const poiTypeNames = { toll: '🛑 Peaje', gas: '⛽ Gasolinera', food: '🍲 Restaurante', police: '🚔 Policía' };
            poisHtml = place.pois.map(poi => `
                <div class="flex justify-between items-center text-[11px] bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div>
                        <span class="font-bold text-white block">${poiTypeNames[poi.type] || '📍'} ${poi.name}</span>
                        <span class="text-slate-400 text-[10px]">${poi.details}</span>
                    </div>
                    <span class="text-amber-400 font-bold text-[10px]">POI</span>
                </div>
            `).join('');
        } else {
            poisHtml = `<p class="text-[10px] text-slate-500">Sin puntos registrados para esta ruta.</p>`;
        }

        placesList.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                
                <button onclick="applyFilters()" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-md">
                    ← Volver a la Lista
                </button>

                <!-- Tarjeta 1: Clima en Destino -->
                <div class="bg-slate-950/90 border border-slate-800/80 p-4 rounded-2xl shadow-xl space-y-2">
                    <div class="flex justify-between items-center border-b border-slate-800/60 pb-2">
                        <span class="text-xs font-bold text-amber-400 flex items-center gap-1.5">🌤 Clima en Destino</span>
                        <span class="text-xl font-black text-white">${weather.temp}</span>
                    </div>
                    <div class="flex justify-between text-xs text-slate-300"><span>Estado:</span><span class="font-bold capitalize text-white">${weather.sky}</span></div>
                    <div class="flex justify-between text-xs text-slate-300"><span>Prob. de lluvia:</span><span class="font-bold text-amber-400">${weather.rainProb}</span></div>
                </div>

                <!-- Tarjeta 2: Ruta y Navegación Externa -->
                <div class="bg-slate-950/90 border border-slate-800/80 p-4 rounded-2xl shadow-xl space-y-3">
                    <div class="flex justify-between items-start">
                        <h3 class="text-xs font-bold text-amber-400">${place.name}</h3>
                        <span class="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase">OSRM Real</span>
                    </div>

                    <div class="space-y-1.5 border-b border-slate-800/60 pb-2 text-xs">
                        <div class="flex justify-between text-slate-300"><span>Distancia por carretera:</span><span class="font-black text-white">${distanceKm} km</span></div>
                        <div class="flex justify-between text-slate-300"><span>Tiempo estimado:</span><span class="font-black text-amber-400">${timeMin} min</span></div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 pt-1">
                        <a href="${gmapsUrl}" target="_blank" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-center text-[11px] transition shadow-md">
                            📍 Abrir en Google Maps
                        </a>
                        <a href="${wazeUrl}" target="_blank" class="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold py-2 rounded-xl text-center text-[11px] transition shadow-md">
                            🚙 Abrir en Waze
                        </a>
                    </div>
                </div>

                <!-- Tarjeta 3: POIs -->
                <div class="bg-slate-950/90 border border-slate-800/80 p-4 rounded-2xl shadow-xl space-y-2">
                    <h4 class="text-xs font-bold text-amber-400 flex items-center gap-1.5">🗺️ Puntos de Interés en la Ruta (POIs)</h4>
                    <div class="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                        ${poisHtml}
                    </div>
                </div>

                <!-- Tarjeta 4: Perfil de Altitud -->
                <div class="bg-slate-950/90 border border-slate-800/80 p-4 rounded-2xl shadow-xl space-y-2">
                    <h4 class="text-xs font-bold text-slate-300 flex items-center gap-1.5">⛰️ Perfil de Altitud (msnm)</h4>
                    <div class="h-32 relative">
                        <canvas id="elevationChart"></canvas>
                    </div>
                </div>

                <!-- Tarjeta 5: ¿Sabías que...? -->
                <div class="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl shadow-xl space-y-1.5">
                    <h4 class="text-xs font-bold text-amber-400 flex items-center gap-1.5">💡 ¿Sabías que...?</h4>
                    <p class="text-[11px] text-slate-300 leading-relaxed">${place.fact}</p>
                </div>

                <!-- Tarjeta 6: Calificaciones -->
                <div class="bg-slate-950/90 border border-slate-800/80 p-4 rounded-2xl shadow-xl space-y-3">
                    <h4 class="text-xs font-bold text-white flex items-center gap-1.5">⭐ Opiniones y Calificaciones</h4>
                    <div class="border-t border-slate-800/60 pt-2 space-y-1.5">
                        <p class="text-[10px] font-bold text-slate-300 uppercase">Califica tu experiencia:</p>
                        <div class="flex gap-1 text-slate-600 cursor-pointer text-base">
                            <span class="hover:text-amber-400 transition">★</span>
                            <span class="hover:text-amber-400 transition">★</span>
                            <span class="hover:text-amber-400 transition">★</span>
                            <span class="hover:text-amber-400 transition">★</span>
                            <span class="hover:text-amber-400 transition">★</span>
                        </div>
                    </div>
                </div>

            </div>
        `;

        setTimeout(() => {
            const ctx = document.getElementById('elevationChart').getContext('2d');
            if (elevationChartInstance) elevationChartInstance.destroy();
            
            const elevData = place.elevationProfile || [2000, 2500, 3000, 3500];
            elevationChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: elevData.map((_, i) => `Km ${(i * 20)}`),
                    datasets: [{
                        label: 'Altitud (msnm)',
                        data: elevData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { display: false } },
                        y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
        }, 100);
    }

    // Filtros por Categoría
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => {
                b.className = "category-btn bg-slate-950 border border-slate-800 text-slate-400 px-3.5 py-1.5 rounded-lg hover:text-white transition whitespace-nowrap font-semibold";
            });

            btn.className = "category-btn active bg-amber-500 text-slate-950 px-3.5 py-1.5 rounded-lg shadow-md transition font-bold whitespace-nowrap";
            selectedCategory = btn.getAttribute('data-category');
            applyFilters();
        });
    });

    window.toggleFavorite = (placeName) => {
        if (favoritesList.includes(placeName)) {
            favoritesList = favoritesList.filter(name => name !== placeName);
        } else {
            favoritesList.push(placeName);
        }
        localStorage.setItem('userFavorites', JSON.stringify(favoritesList));
        applyFilters();
    };

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    // Geolocalización GPS
    const btnGps = document.getElementById('btnGpsLocation');
    const gpsStatusText = document.getElementById('gpsStatusText');
    const originInput = document.getElementById('originInput');

    if (btnGps) {
        btnGps.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert("⚠️ Tu navegador no soporta geolocalización GPS.");
                return;
            }

            gpsStatusText.innerText = "📡 Obteniendo coordenadas GPS...";
            gpsStatusText.classList.remove('hidden');

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userCurrentLocation.lat = position.coords.latitude;
                    userCurrentLocation.lng = position.coords.longitude;

                    gpsStatusText.innerText = `Origen actual: GPS (${userCurrentLocation.lat.toFixed(4)}, ${userCurrentLocation.lng.toFixed(4)})`;
                    gpsStatusText.className = "text-[11px] text-emerald-400 mt-1 font-bold";
                    
                    if (originInput) originInput.value = "Tu Ubicación Actual (GPS Activo)";

                    if (userMarker) map.removeLayer(userMarker);
                    userMarker = L.circleMarker([userCurrentLocation.lat, userCurrentLocation.lng], {
                        radius: 8,
                        fillColor: "#38bdf8",
                        color: "#ffffff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.9
                    }).addTo(map).bindPopup("📍 Estás Aquí").openPopup();

                    map.setView([userCurrentLocation.lat, userCurrentLocation.lng], 10);
                },
                (error) => {
                    console.error("Error GPS:", error);
                    gpsStatusText.innerText = "Origen actual: Bogotá - Centro";
                    gpsStatusText.className = "text-[11px] text-amber-400 mt-1 font-semibold";
                }
            );
        });
    }

    applyFilters();
});