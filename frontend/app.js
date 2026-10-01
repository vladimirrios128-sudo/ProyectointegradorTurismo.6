/* Turismo Inteligente — Frontend
 * UI orchestration is kept here; index.html contains structure only.
 * API integrations can be replaced without touching the visual layer.
 */

        const API_HOST = window.location.hostname || "localhost";
        const API_PROTOCOL = window.location.protocol === "file:" ? "http:" : window.location.protocol;
        const API_URL = "http://127.0.0.1:8000";

        let authToken = localStorage.getItem('jwt_token') || null;

        let map = null;
        let currentRole = 'user';
        let currentTransport = 'driving';
        let currentCategory = 'All';
        let currentPolyline = null;
        let selectedPlace = null;
        let originMarker = null;
        let selectedRating = 5;
        let preferencesChart = null;
        let predictiveChart = null;
        let qrCodeObj = null;

        let favoritesList = JSON.parse(localStorage.getItem('fav_places') || '[]');
        let currentOrigin = { lat: 4.5981, lng: -74.0758, name: "Bogotá - Centro" };


        // ----------------------------- API LAYER -----------------------------
        async function apiRequest(path, options = {}) {
            const headers = { ...(options.headers || {}) };
            if (!(options.body instanceof FormData) && options.body && !headers["Content-Type"]) {
                headers["Content-Type"] = "application/json";
            }
            if (authToken) headers.Authorization = `Bearer ${authToken}`;

            const response = await fetch(`${API_URL}${path}`, { ...options, headers });
            const contentType = response.headers.get("content-type") || "";
            const data = contentType.includes("application/json")
                ? await response.json()
                : await response.text();

            if (!response.ok) {
                const message = typeof data === "object" && data?.detail
                    ? data.detail
                    : "No fue posible completar la operación.";
                throw new Error(message);
            }
            return data;
        }

        function setSession(data) {
            authToken = data.access_token || null;
            if (authToken) localStorage.setItem("jwt_token", authToken);
            if (data.role) currentRole = data.role;
            localStorage.setItem("user_role", currentRole);
            localStorage.setItem("user_name", data.full_name || "");
        }

        function clearSession() {
            authToken = null;
            localStorage.removeItem("jwt_token");
            localStorage.removeItem("user_role");
            localStorage.removeItem("user_name");
        }

        

        // LISTA DE 16 DESTINOS DE COLOMBIA
        

        // FUNCIONES DE AUTENTICACIÓN SOCIAL (GOOGLE / GMAIL)
      

       

        function handleUploadMedia(e) {
            e.preventDefault();
            const title = document.getElementById('media-title').value;
            const url = document.getElementById('media-url').value;
            
            const previewContainer = document.getElementById('merchant-gallery-preview');
            const card = document.createElement('div');
            card.className = "bg-slate-950 border border-slate-800 rounded-xl p-2 text-center";
            card.innerHTML = `
                <img src="${url}" class="w-full h-24 object-cover rounded-lg mb-2">
                <span class="text-[10px] font-bold text-emerald-400">${title}</span>
            `;
            previewContainer.prepend(card);
            alert("¡Foto/Banner cargado exitosamente a la plataforma!");
            document.getElementById('media-title').value = '';
            document.getElementById('media-url').value = '';
        }

        // SUB-PANELES DE ADMIN GLOBAL
        function switchAdminGlobalTab(tab) {
            const tabs = ['kpi', 'allpromos', 'visitors', 'merchants', 'alerts'];
            tabs.forEach(t => {
                const btn = document.getElementById(`gtab-${t}`);
                const sec = document.getElementById(`gsec-${t}`);
                if (t === tab) {
                    btn.className = "px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5";
                    sec.classList.remove('hidden');
                } else {
                    btn.className = "px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl cursor-pointer transition-all flex items-center gap-1.5";
                    sec.classList.add('hidden');
                }
            });

            if (tab === 'kpi') initPreferencesChart();
            if (tab === 'visitors') renderVisitorsTable();
        }

        function handleBroadcastAlert(e) {
            e.preventDefault();
            alert("¡Alerta emitida exitosamente para la comunidad!");
        }

        // SUB-PANELES DE COMERCIO
        function switchMerchantTab(tab) {
            const tabs = ['analytics', 'media', 'promo', 'coupons', 'menu', 'whatsapp'];
            tabs.forEach(t => {
                const btn = document.getElementById(`mtab-${t}`);
                const sec = document.getElementById(`msec-${t}`);
                if (t === tab) {
                    btn.className = "px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5";
                    sec.classList.remove('hidden');
                } else {
                    btn.className = "px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl cursor-pointer transition-all flex items-center gap-1.5";
                    sec.classList.add('hidden');
                }
            });

            if (tab === 'analytics') initPredictiveChart();
            if (tab === 'menu') generateMenuQR();
        }

        function initPredictiveChart() {
            const ctx = document.getElementById('predictiveChart').getContext('2d');
            if (predictiveChart) predictiveChart.destroy();
            predictiveChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                    datasets: [{
                        label: 'Proyección de Turistas',
                        data: [45, 60, 75, 110, 240, 420, 380],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
                        y: { grid: { color: '#1e293b' }, ticks: { color: '#f8fafc' } }
                    }
                }
            });
        }

        function generateMenuQR() {
            const url = document.getElementById('qr-url-input').value;
            const container = document.getElementById('qrcode-container');
            container.innerHTML = '';
            qrCodeObj = new QRCode(container, {
                text: url,
                width: 120,
                height: 120,
                colorDark: "#020617",
                colorLight: "#ffffff"
            });
        }

        function redeemCoupon() {
            const code = document.getElementById('coupon-validate-input').value.trim().toUpperCase();
            if (!code) { alert("Ingresa un código promocional válido."); return; }
            alert(`¡El cupón '${code}' ha sido verificado y redimido exitosamente en caja!`);
            document.getElementById('coupon-validate-input').value = '';
        }

        function testWhatsAppLink() {
            const num = document.getElementById('wa-number').value.replace(/[^0-9]/g, '');
            const msg = encodeURIComponent("Hola! Quiero reservar para el fin de semana.");
            window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
        }

        function openMerchantPanel() {
            document.getElementById('merchant-modal').classList.remove('hidden');
            switchMerchantTab('analytics');
        }

        function closeMerchantPanel() {
            document.getElementById('merchant-modal').classList.add('hidden');
        }

        function handleCreatePromo(e) {
            e.preventDefault();
            alert("¡Promoción relámpago lanzada!");
        }

       

        function renderVisitorsTable() {
            const tableBody = document.getElementById('visitors-table-body');
            tableBody.innerHTML = '';
            visitorData.forEach(v => {
                const row = document.createElement('tr');
                row.className = "hover:bg-slate-800/40 transition-colors";
                row.innerHTML = `
                    <td class="p-3 font-mono font-bold text-amber-400">${v.id}</td>
                    <td class="p-3">${v.origin}</td>
                    <td class="p-3 font-semibold text-white">${v.destination}</td>
                    <td class="p-3">${v.transport}</td>
                    <td class="p-3 text-slate-400">${v.time}</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">${v.status}</span></td>
                `;
                tableBody.appendChild(row);
            });
        }

        function exportVisitorsCSV() {
            let csvContent = "data:text/csv;charset=utf-8,ID,Origen,Destino,Transporte,Hora,Estado\n";
            visitorData.forEach(v => { csvContent += `${v.id},"${v.origin}","${v.destination}",${v.transport},${v.time},${v.status}\n`; });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "registro_visitantes.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function openAdminDashboard() {
            document.getElementById('dashboard-modal').classList.remove('hidden');
            switchAdminGlobalTab('kpi');
        }

        function closeAdminDashboard() { document.getElementById('dashboard-modal').classList.add('hidden'); }

        function initPreferencesChart() {
            const ctx = document.getElementById('preferencesChart').getContext('2d');
            if (preferencesChart) preferencesChart.destroy();
            preferencesChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Naturaleza', 'Cultura', 'Gastronomía', 'Aventura', 'Alojamiento'],
                    datasets: [{ label: '% Preferencia', data: [50, 30, 17, 15, 15], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'], borderRadius: 8 }]
                },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        function updateDashboardData() {
            const season = document.getElementById('season-selector').value;
            if (season === 'Alta') {
                document.getElementById('kpi-visitors').innerText = '2,840';
                document.getElementById('kpi-zones').innerText = '8 Puntos';
                document.getElementById('kpi-duration').innerText = '4.2h';
            } else if (season === 'Media') {
                document.getElementById('kpi-visitors').innerText = '1,250';
                document.getElementById('kpi-zones').innerText = '5 Puntos';
                document.getElementById('kpi-duration').innerText = '3.5h';
            } else {
                document.getElementById('kpi-visitors').innerText = '610';
                document.getElementById('kpi-zones').innerText = '3 Puntos';
                document.getElementById('kpi-duration').innerText = '2.1h';
            }
        }

        // FUNCIONES DE FAVORITOS Y RESEÑAS
        function toggleFavorite(event, placeName) {
            event.stopPropagation();
            if (favoritesList.includes(placeName)) favoritesList = favoritesList.filter(name => name !== placeName);
            else favoritesList.push(placeName);
            localStorage.setItem('fav_places', JSON.stringify(favoritesList));
            renderPlacesList();
        }

        function setRating(stars) {
            selectedRating = stars;
            document.querySelectorAll('#star-selector i').forEach((icon, idx) => {
                if (idx < stars) icon.classList.add('active');
                else icon.classList.remove('active');
            });
        }

        async function loadReviews(placeName) {
            const container = document.getElementById('reviews-list');
            document.getElementById('reviews-section').classList.remove('hidden');
            try {
                const reviews = await apiRequest(`/api/v1/reviews/${encodeURIComponent(placeName)}`);
                container.innerHTML = reviews.length
                    ? reviews.map(review => `
                        <div class="p-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px]">
                            <div class="flex justify-between items-center mb-1">
                                <span class="font-bold text-amber-400">${review.user_name}</span>
                                <span class="text-amber-500 text-[10px]">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span>
                            </div>
                            <p class="text-slate-300 text-[10px]">${review.comment}</p>
                        </div>`).join('')
                    : '<p class="text-[11px] text-slate-500 text-center py-2">Sin opiniones aún.</p>';
            } catch (error) {
                console.warn("No se pudieron cargar las reseñas:", error.message);
                container.innerHTML = '<p class="text-[11px] text-slate-500 text-center py-2">No hay reseñas disponibles.</p>';
            }
        }

        async function submitReview() {
            if (!selectedPlace) return;
            const comment = document.getElementById('review-comment').value.trim();
            if (!comment) return alert("Escribe un comentario.");
            if (!authToken) return alert("Inicia sesión para publicar una reseña.");

            try {
                await apiRequest("/api/v1/reviews/", {
                    method: "POST",
                    body: JSON.stringify({
                        place_name: selectedPlace.name,
                        rating: selectedRating,
                        comment
                    })
                });
                document.getElementById('review-comment').value = '';
                await loadReviews(selectedPlace.name);
                alert("¡Reseña publicada!");
            } catch (error) {
                alert(error.message);
            }
        }

        function searchOriginNominatim(e) { if (e.key === 'Enter') triggerOriginSearch(); }

        async function triggerOriginSearch() {
            const query = document.getElementById('origin-search').value;
            if (!query) return;

            document.getElementById('origin-status').innerText = "Buscando ubicación...";
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Colombia")}`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data && data.length > 0) {
                    const firstMatch = data[0];
                    currentOrigin = { lat: parseFloat(firstMatch.lat), lng: parseFloat(firstMatch.lon), name: firstMatch.display_name.split(',')[0] };
                    document.getElementById('origin-status').innerText = `Origen: ${currentOrigin.name}`;
                    if (originMarker) originMarker.setLatLng([currentOrigin.lat, currentOrigin.lng]);
                    map.setView([currentOrigin.lat, currentOrigin.lng], 8);
                    if (selectedPlace) calculateRoute(selectedPlace);
                }
            } catch (err) { console.error(err); }
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
            loadReviews(place.name);

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

        function filterCategory(cat) { currentCategory = cat; renderPlacesList(); }
        function filterPlaces() { renderPlacesList(); }

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
                            <span style="font-size: 10px; background-color: #fef3c7; color: #92400e; padding: 2px 5px; border-radius: 4px; font-weight: bold;">${place.category}</span>
                            <button onclick="calculateRoute(touristPlaces[${idx}])" style="background-color: #f59e0b; color: #020617; border: none; padding: 5px 8px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 5px; width: 100%; font-size: 11px;">Ver Ruta y Clima</button>
                        </div>
                    `);
                });
            }
        }

        function setTransport(type) {
            currentTransport = type;
            if (selectedPlace) calculateRoute(selectedPlace);
        }

        function launchApp(roleName, userEmail) {
            document.getElementById('auth-modal').classList.add('hidden');
            document.getElementById('map')?.classList.remove('hidden');
            document.getElementById('app-nav').classList.remove('hidden');
            document.getElementById('app-nav').classList.add('flex');
            document.getElementById('side-panel').classList.remove('hidden');
            
            document.getElementById('user-badge').innerHTML = `<i class="fa-solid fa-user-circle mr-1"></i> ${roleName}: ${userEmail || ''}`;
            
            if (currentRole === 'admin') {
                document.getElementById('admin-dashboard-btn').classList.remove('hidden');
                document.getElementById('merchant-panel-btn').classList.add('hidden');
            } else if (currentRole === 'merchant') {
                document.getElementById('merchant-panel-btn').classList.remove('hidden');
                document.getElementById('admin-dashboard-btn').classList.add('hidden');
            } else {
                document.getElementById('admin-dashboard-btn').classList.add('hidden');
                document.getElementById('merchant-panel-btn').classList.add('hidden');
            }

            initMap();
            renderPlacesList();

            if (map) map.invalidateSize();

            let operatorMapButton = document.getElementById("operator-map-return");
            if (currentRole === "operador") {
                if (!operatorMapButton) {
                    operatorMapButton = document.createElement("button");
                    operatorMapButton.id = "operator-map-return";
                    operatorMapButton.type = "button";
                    operatorMapButton.textContent = "💼 Volver al Panel";
                    Object.assign(operatorMapButton.style, {
                        position: "fixed",
                        top: "82px",
                        left: "min(370px, calc(100vw - 190px))",
                        zIndex: "45",
                        backgroundColor: "#10b981",
                        color: "#020617",
                        border: "none",
                        borderRadius: "0.375rem",
                        padding: "0.625rem 1rem",
                        cursor: "pointer",
                        fontWeight: "bold",
                        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.25)"
                    });
                    operatorMapButton.addEventListener("click", () => {
                        document.getElementById("main-app-container")?.classList.add("hidden");
                        document.getElementById("app-nav")?.classList.add("hidden");
                        document.getElementById("side-panel")?.classList.add("hidden");
                        document.getElementById("map")?.classList.add("hidden");

                        const merchantModal = document.getElementById("merchant-modal");
                        merchantModal?.classList.remove("hidden");
                        if (merchantModal) merchantModal.style.display = "block";
                        renderOperadorPanel();
                    });
                    document.body.appendChild(operatorMapButton);
                }
                operatorMapButton.classList.remove("hidden");
            } else {
                operatorMapButton?.classList.add("hidden");
            }
        }

        function toggleAuthView(view) {
            const showRegister = view === "register";
            document.getElementById("login-view").classList.toggle("hidden", showRegister);
            document.getElementById("register-view").classList.toggle("hidden", !showRegister);
        }

        async function handleRegister(event) {
            event.preventDefault();

            const form = event.currentTarget;
            const button = document.getElementById("btn-register-submit");
            const messageBox = document.getElementById("register-message");
            const formData = new FormData(form);
            const payload = {
                full_name: formData.get("full_name").trim(),
                email: formData.get("email").trim(),
                password: formData.get("password"),
                requested_account_type: formData.get("requested_account_type"),
            };

            messageBox.classList.add("hidden");
            messageBox.textContent = "";
            button.disabled = true;
            button.textContent = "Creando cuenta...";

            try {
                const response = await fetch(`${API_URL}/api/v1/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await response.json();

                if (!response.ok) {
                    const detail = Array.isArray(data.detail)
                        ? data.detail.map((item) => item.msg).join(" ")
                        : data.detail;
                    throw new Error(detail || "No fue posible crear la cuenta.");
                }

                messageBox.textContent = "Cuenta creada. Tu rol inicial es Turista. Las cuentas de Operador Turístico requieren aprobación administrativa antes de asignar ese rol.";
                messageBox.className = "rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300";
                form.reset();
            } catch (error) {
                messageBox.textContent = error.message || "No fue posible crear la cuenta.";
                messageBox.className = "rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400";
            } finally {
                button.disabled = false;
                button.textContent = "Crear cuenta";
                messageBox.classList.remove("hidden");
            }
        }

      async function handleLogin(event) {
    event.preventDefault();

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const button = document.getElementById("btn-login-submit");
    const errorBox = document.getElementById("login-error");

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    errorBox.classList.add("hidden");
    errorBox.textContent = "";

    if (!email || !password) {
        errorBox.textContent = "Ingresa tu correo y contraseña.";
        errorBox.classList.remove("hidden");
        return;
    }

    button.disabled = true;
    button.textContent = "Ingresando...";

    try {
        const body = new URLSearchParams();
        body.append("username", email);
        body.append("password", password);

        const response = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Correo o contraseña incorrectos.");
        }

        localStorage.setItem("jwt_token", data.access_token);
        localStorage.setItem("user_role", data.rol);
        localStorage.setItem("user_name", data.full_name || "");

        authToken = data.access_token;
        currentRole = data.rol;

        if (data.rol === "admin_global" || data.rol === "admin_comercio") {
            window.location.href = "admin.html";
            return;
        }

        const formLogin = document.getElementById("form-login");

        if (currentRole === "turista") {
            if (formLogin) formLogin.classList.add("hidden");
            launchApp("Turista", data.full_name || email);
            return;
        }

        if (currentRole === "operador") {
            document.getElementById("auth-modal")?.classList.add("hidden");
            document.getElementById("form-login")?.classList.add("hidden");
            if (document.getElementById("auth-modal")) document.getElementById("auth-modal").style.display = "none";
            renderOperadorPanel();
            return;
        }
    } catch (error) {
        console.error("Error de login:", error);
        errorBox.textContent = error.message || "No fue posible iniciar sesión.";
        errorBox.classList.remove("hidden");
    } finally {
        button.disabled = false;
        button.textContent = "Ingresar";
    }
}
  
document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("form-login");

    if (loginForm) {
        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }

    const registerForm = document.getElementById("form-register");
    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }


    const guestButton = document.getElementById("btn-guest");

    if (guestButton) {

        guestButton.addEventListener(
            "click",
            loginAsGuest
        );

    }

});
        function loginAsGuest() {
            currentRole = 'guest';
            launchApp('Modo Invitado', 'Invitado');
        }

        function logout() {
            clearSession();
            currentRole = 'user';
            localStorage.removeItem('fav_places');
            document.getElementById('auth-modal').classList.remove('hidden');
            document.getElementById('app-nav').classList.add('hidden');
            document.getElementById('side-panel').classList.add('hidden');
            document.getElementById('merchant-modal').classList.add('hidden');
            document.getElementById('dashboard-modal').classList.add('hidden');
            document.getElementById("operator-map-return")?.classList.add("hidden");
            if (map) {
                map.remove();
                map = null;
                currentPolyline = null;
            }
        }

        async function handleCreateRoute(event) {
            event.preventDefault();

            const form = event.currentTarget;
            const formData = new FormData(form);
            const payload = {
                name: formData.get("name").trim(),
                destination: formData.get("destination").trim(),
                description: formData.get("description").trim(),
                price: parseFloat(formData.get("price"))
            };

            try {
                const response = await fetch(`${API_URL}/api/v1/routes/`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("jwt_token")}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.detail || "No fue posible crear la ruta.");
                }

                alert("¡Ruta creada exitosamente!");
                form.reset();
            } catch (error) {
                alert(error.message || "No fue posible crear la ruta.");
            }
        }

        function renderOperadorPanel() {
    // Buscamos el contenedor real de tu HTML (merchant-modal)
    const container = document.getElementById("merchant-modal");
    if (!container) return; // Freno de seguridad si no existe
    
    // Le quitamos la clase hidden para que se dibuje en pantalla
    container.classList.remove("hidden");
    container.style.display = "block";
    
    container.innerHTML = `
        <div style="background-color: #0f172a; color: white; min-height: 100vh; padding: 2rem; font-family: sans-serif; position: relative; z-index: 100;">
            <!-- Encabezado -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 1rem; gap: 1rem;">
                <h2>Panel de Operador Turístico 💼</h2>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <button onclick="document.getElementById('merchant-modal')?.classList.add('hidden'); if (document.getElementById('merchant-modal')) document.getElementById('merchant-modal').style.display = 'none'; document.getElementById('main-app-container')?.classList.remove('hidden'); if (typeof launchApp === 'function') launchApp('Turista', localStorage.getItem('user_name') || 'Operador');" style="background-color: #fbbf24; color: #0f172a; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-weight: bold;">🗺️ Ver Mapa de Turista</button>
                    <button onclick="localStorage.clear(); location.reload();" style="background-color: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-weight: bold;">Salir</button>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
                <!-- COLUMNA 1: FORMULARIO CRUD (CREAR RUTA) -->
                <div style="background-color: #1e293b; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h3 style="color: #fbbf24; margin-bottom: 1rem;">Crear Nueva Ruta Turística ✈️</h3>
                    <form id="ruta-form" onsubmit="handleCreateRoute(event)">
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: #94a3b8;">Nombre de la Ruta:</label>
                            <input type="text" name="name" placeholder="Ej: Tour Histórico por el Eje Cafetero" style="width: 100%; padding: 0.5rem; border-radius: 0.25rem; border: 1px solid #475569; background-color: #0f172a; color: white;" required>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: #94a3b8;">Ciudad de Destino:</label>
                            <input type="text" name="destination" placeholder="Ej: Manizales" style="width: 100%; padding: 0.5rem; border-radius: 0.25rem; border: 1px solid #475569; background-color: #0f172a; color: white;" required>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: #94a3b8;">Descripción:</label>
                            <textarea name="description" placeholder="Describe los puntos a visitar..." style="width: 100%; padding: 0.5rem; border-radius: 0.25rem; border: 1px solid #475569; background-color: #0f172a; color: white; height: 80px;" required></textarea>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: #94a3b8;">Precio por Persona (COP):</label>
                            <input type="number" name="price" placeholder="Ej: 150000" style="width: 100%; padding: 0.5rem; border-radius: 0.25rem; border: 1px solid #475569; background-color: #0f172a; color: white;" required>
                        </div>
                        <button type="submit" style="width: 100%; background-color: #fbbf24; color: #0f172a; font-weight: bold; border: none; padding: 0.75rem; border-radius: 0.25rem; cursor: pointer; font-size: 1rem;">Publicar Ruta Turística</button>
                    </form>
                </div>

                <!-- COLUMNA 2: READ (ESTADÍSTICAS PROBABILIDADES) -->
                <div style="background-color: #1e293b; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h3 style="color: #fbbf24; margin-bottom: 1rem;">Probabilidad de Arribo de Turistas (Por Género) 📊</h3>
                    <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1rem;">Métrica estimada en base a búsquedas de la temporada actual:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 1px solid #475569; color: #94a3b8;">
                                <th style="padding: 0.5rem;">Ciudad Destino</th>
                                <th style="padding: 0.5rem;">♂️ Hombres</th>
                                <th style="padding: 0.5rem;">♀️ Mujeres</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid #334155;">
                                <td style="padding: 0.75rem; font-weight: bold;">Bogotá</td>
                                <td style="padding: 0.75rem; color: #38bdf8;">52%</td>
                                <td style="padding: 0.75rem; color: #f472b6;">48%</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #334155;">
                                <td style="padding: 0.75rem; font-weight: bold;">Medellín</td>
                                <td style="padding: 0.75rem; color: #38bdf8;">45%</td>
                                <td style="padding: 0.75rem; color: #f472b6;">55%</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #334155;">
                                <td style="padding: 0.75rem; font-weight: bold;">Cartagena</td>
                                <td style="padding: 0.75rem; color: #38bdf8;">40%</td>
                                <td style="padding: 0.75rem; color: #f472b6;">60%</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #334155;">
                                <td style="padding: 0.75rem; font-weight: bold;">Santa Marta</td>
                                <td style="padding: 0.75rem; color: #38bdf8;">48%</td>
                                <td style="padding: 0.75rem; color: #f472b6;">52%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}
