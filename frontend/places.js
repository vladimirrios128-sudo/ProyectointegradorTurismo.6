/**
 * Turismo Inteligente - Colombia
 * Manejo del Catálogo de Lugares Turísticos y Favoritos
 */

document.addEventListener('DOMContentLoaded', () => {
  // Datos precargados de Colombia
  const SAMPLE_PLACES = [
    {
      id: 1,
      name: 'Parque Nacional Natural El Cocuy',
      description: 'Espectacular sierra nevada en los Andes orientales con picos glaciares como el Pan de Azúcar, lagunas de origen glaciar y senderos de alta montaña para montañismo responsable.',
      category: 'Aventura',
      department: 'Boyacá',
      city: 'El Cocuy',
      latitude: 6.4678,
      longitude: -72.3167,
      entry_fee: 38000,
      rating: 4.9,
      image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 2,
      name: 'Parque Nacional Natural Los Nevados',
      description: 'Páramos volcánicos andinos coronados por el volcán Nevado del Ruiz y del Tolima. Hábitat del cóndor andino y bosques de frailejones milenarios.',
      category: 'Aventura',
      department: 'Caldas / Tolima',
      city: 'Manizales',
      latitude: 4.8922,
      longitude: -75.3194,
      entry_fee: 34000,
      rating: 4.8,
      image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 3,
      name: 'Ciudad Amurallada e Historia de Cartagena',
      description: 'Patrimonio histórico de la humanidad con fortificaciones coloniales, balcones con buganvilias, plazas coloniales y el emblemático Castillo San Felipe de Barajas.',
      category: 'Histórico',
      department: 'Bolívar',
      city: 'Cartagena de Indias',
      latitude: 10.4236,
      longitude: -75.5528,
      entry_fee: 25000,
      rating: 4.9,
      image_url: 'https://images.unsplash.com/photo-1583531352515-8884af319dc1?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 4,
      name: 'Pueblo de Guatapé y Piedra del Peñol',
      description: 'Famoso por sus zócalos pintorescos tallados a mano en cada fachada y la impresionante mole monolítica de 220 metros con vista panorámica 360 grados sobre el embalse.',
      category: 'Cultural',
      department: 'Antioquia',
      city: 'Guatapé',
      latitude: 6.2328,
      longitude: -75.1565,
      entry_fee: 20000,
      rating: 4.7,
      image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 5,
      name: 'Santuario de Las Lajas',
      description: 'Obra maestra de la arquitectura neogótica erigida en el cañón del río Guáitara. Una joya arquitectónica e histórica reconocida a nivel mundial.',
      category: 'Histórico',
      department: 'Nariño',
      city: 'Ipiales',
      latitude: 0.8053,
      longitude: -77.5861,
      entry_fee: 0,
      rating: 4.9,
      image_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 6,
      name: 'Caño Cristales - El Río de los Siete Colores',
      description: 'Río biológico en la Sierra de la Macarena donde la planta acuática Macarenia clavigera tiñe sus aguas cristalinas de rojo, fucsia, verde y amarillo.',
      category: 'Aventura',
      department: 'Meta',
      city: 'La Macarena',
      latitude: 2.2618,
      longitude: -73.7919,
      entry_fee: 45000,
      rating: 5.0,
      image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    },
  ];

  let currentCategory = 'Todos';
  let searchQuery = '';
  let onlyFavorites = false;
  let favorites = JSON.parse(localStorage.getItem('turismo_favorites') || '[]');

  const skeletonGrid = document.getElementById('places-skeleton-grid');
  const placesGrid = document.getElementById('places-grid');
  const emptyState = document.getElementById('places-empty-state');
  const searchInput = document.getElementById('places-search');
  const favCountEl = document.getElementById('fav-count');
  const toggleFavBtn = document.getElementById('btn-toggle-favorites');

  function updateFavCount() {
    if (favCountEl) favCountEl.textContent = favorites.length;
  }

  function toggleFavorite(id, e) {
    if (e) e.stopPropagation();
    const index = favorites.indexOf(id);
    if (index > -1) {
      favorites.splice(index, 1);
      if (window.TurismoApp) {
        window.TurismoApp.showRbacAlert('Favoritos', 'Lugar removido de tu lista personal.', true);
      }
    } else {
      favorites.push(id);
      if (window.TurismoApp) {
        window.TurismoApp.showRbacAlert('Favoritos', 'Lugar añadido a tus favoritos.', false);
      }
    }
    localStorage.setItem('turismo_favorites', JSON.stringify(favorites));
    updateFavCount();
    renderPlaces();
  }

  function renderPlaces() {
    if (!placesGrid) return;

    let filtered = SAMPLE_PLACES.filter((p) => {
      const matchCat = currentCategory === 'Todos' || p.category === currentCategory;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFav = !onlyFavorites || favorites.includes(p.id);
      return matchCat && matchSearch && matchFav;
    });

    if (filtered.length === 0) {
      placesGrid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    placesGrid.style.display = 'grid';

    placesGrid.innerHTML = filtered
      .map((place) => {
        const isFav = favorites.includes(place.id);
        const catClass =
          place.category === 'Aventura'
            ? 'category-aventura'
            : place.category === 'Cultural'
            ? 'category-cultural'
            : 'category-historico';

        return `
          <div class="place-card" onclick="window.openPlaceModal(${place.id})">
            <div class="place-media-container">
              <img src="${place.image_url}" alt="${place.name}" class="place-image" loading="lazy">
              <span class="place-badge-category ${catClass}">${place.category}</span>
              <button class="fav-btn ${isFav ? 'active' : ''}" onclick="window.toggleFav(${place.id}, event)" title="Añadir a favoritos">
                <i data-lucide="heart" style="width: 18px; height: 18px; ${isFav ? 'fill: currentColor;' : ''}"></i>
              </button>
            </div>
            <div class="place-content">
              <div class="place-header-info">
                <span class="place-location">${place.city}, ${place.department}</span>
                <span class="place-rating">★ ${place.rating}</span>
              </div>
              <h3 class="place-title">${place.name}</h3>
              <p class="place-desc">${place.description}</p>
              <div class="place-footer">
                <div>
                  <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Entrada / Aporte</span>
                  <span class="place-price-val">${place.entry_fee > 0 ? '$' + place.entry_fee.toLocaleString() + ' COP' : 'Ingreso Libre'}</span>
                </div>
                <button class="btn btn-outline" style="padding: 0.4rem 0.85rem; font-size: 0.8125rem;">
                  <span>Detalles</span>
                  <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Simulación de carga fluida con skeletons
  setTimeout(() => {
    if (skeletonGrid) skeletonGrid.style.display = 'none';
    renderPlaces();
  }, 450);

  // Manejo de Filtros
  const filterButtons = document.querySelectorAll('.filter-tab');
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('active', 'btn-primary');
      currentCategory = btn.getAttribute('data-category') || 'Todos';
      renderPlaces();
    });
  });

  // Búsqueda en tiempo real
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderPlaces();
    });
  }

  // Alternar vista de favoritos
  if (toggleFavBtn) {
    toggleFavBtn.addEventListener('click', () => {
      onlyFavorites = !onlyFavorites;
      toggleFavBtn.classList.toggle('btn-primary', onlyFavorites);
      toggleFavBtn.classList.toggle('btn-outline', !onlyFavorites);
      renderPlaces();
    });
  }

  // Modal de Detalle
  window.openPlaceModal = function (id) {
    const place = SAMPLE_PLACES.find((p) => p.id === id);
    if (!place) return;

    const modal = document.getElementById('place-detail-modal');
    const content = document.getElementById('modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="position: relative; margin-bottom: 1.5rem;">
        <img src="${place.image_url}" alt="${place.name}" style="width: 100%; height: 260px; object-fit: cover; border-radius: 16px;">
        ${place.name.includes('Cocuy') ? `
          <div style="position: absolute; top: 1rem; right: 1rem; background: rgba(12, 16, 23, 0.75); backdrop-filter: blur(12px) saturate(180%); -webkit-backdrop-filter: blur(12px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 0.4rem 0.75rem; display: flex; align-items: center; gap: 0.6rem; color: #F8F6F0;">
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="cloud-sun" style="width: 16px; height: 16px; color: #D4AF37;"></i>
              <span style="font-weight: 800; font-size: 0.875rem;">4°C</span>
            </div>
            <div style="width: 1px; height: 14px; background: rgba(255,255,255,0.15);"></div>
            <div style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: #cbd5e1;">
              <i data-lucide="snowflake" style="width: 13px; height: 13px; color: #38bdf8;"></i>
              <span>1° / 8°C</span>
            </div>
          </div>
        ` : ''}
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
        <span class="place-badge-category category-${place.category.toLowerCase()}">${place.category}</span>
        <span style="color: var(--accent-terracotta); font-size: 0.875rem; font-weight: 600;">${place.city}, ${place.department}</span>
      </div>
      <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 1rem;">${place.name}</h2>
      <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">${place.description}</p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-surface); border-radius: 14px; border: 1px solid var(--glass-border);">
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Calificación Promedio</span>
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-gold);">★ ${place.rating} / 5.0</div>
        </div>
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Costo Estimado</span>
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${place.entry_fee > 0 ? '$' + place.entry_fee.toLocaleString() + ' COP' : 'Entrada Gratuita'}</div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 1rem;">
        <button class="btn btn-primary" onclick="document.getElementById('place-detail-modal').style.display='none'">
          <span>Cerrar</span>
        </button>
      </div>
    `;

    modal.style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();
  };

  const closeBtn = document.getElementById('close-modal-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('place-detail-modal').style.display = 'none';
    });
  }

  window.toggleFav = toggleFavorite;
  updateFavCount();
});
