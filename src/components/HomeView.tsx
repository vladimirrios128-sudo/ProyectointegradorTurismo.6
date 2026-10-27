import L from 'leaflet';
import {
  Bus,
  Car,
  Clock,
  Compass,
  Footprints,
  Layers,
  LocateFixed,
  MapPin,
  Mountain,
  Navigation2,
  Sparkles
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { calculateColombianDistance } from '../utils/rbac';
import { ApiPlace, fetchPublishedPlaces, resolvePlaceImageUrl } from '../utils/places';

interface HomeViewProps {
  onNavigate: (view: 'index' | 'places' | 'merchant' | 'admin' | 'code') => void;
  onTriggerAlert: (title: string, message: string, isWarning?: boolean) => void;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const DESTINATIONS = [
  { id: 'bogota', name: 'Bogotá D.C. (Plaza de Bolívar)', lat: 4.5981, lng: -74.0758, dept: 'Cundinamarca' },
  { id: 'cocuy', name: 'Parque Nacional Natural El Cocuy', lat: 6.4678, lng: -72.3167, dept: 'Boyacá' },
  { id: 'nevados', name: 'Parque Nacional Los Nevados', lat: 4.8922, lng: -75.3194, dept: 'Caldas' },
  { id: 'cartagena', name: 'Cartagena de Indias (Murallas)', lat: 10.4236, lng: -75.5528, dept: 'Bolívar' },
  { id: 'guatape', name: 'Guatapé (Piedra del Peñol)', lat: 6.2328, lng: -75.1565, dept: 'Antioquia' },
  { id: 'lajas', name: 'Santuario de Las Lajas', lat: 0.8053, lng: -77.5861, dept: 'Nariño' },
];

const BUS_COMPANIES = [
  { name: 'Expreso Bolivariano', url: 'https://bolivariano.com.co' },
  { name: 'Copetran', url: 'https://copetran.com' },
  { name: 'Nueva Flota Boyacá', url: 'https://nuevaflotaboyaca.com.co/' },
  { name: 'Coflonorte / Libertadores', url: 'http://www.coflonorte.com/' },
];

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onTriggerAlert,
}) => {
  const [originId, setOriginId] = useState('bogota');
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [destinationId, setDestinationId] = useState('cocuy');
  const [transportMode, setTransportMode] = useState<'vehicle' | 'bus' | 'walking'>('vehicle');
  const [publishedPlaces, setPublishedPlaces] = useState<ApiPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [placesError, setPlacesError] = useState('');
  const [placesReloadKey, setPlacesReloadKey] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const publishedPlacesLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingPlaces(true);
    setPlacesError('');

    fetchPublishedPlaces()
      .then((places) => {
        if (isMounted) setPublishedPlaces(places);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setPlacesError(error instanceof Error ? error.message : 'No se pudieron cargar los atractivos verificados.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlaces(false);
      });

    return () => { isMounted = false; };
  }, [placesReloadKey]);

  const selectedOrigin = DESTINATIONS.find((d) => d.id === originId) || DESTINATIONS[0];
  const origin = useMemo(
    () => currentLocation
      ? { ...currentLocation, name: 'Mi Ubicación Actual', dept: 'Ubicación actual' }
      : selectedOrigin,
    [currentLocation, selectedOrigin]
  );
  const destination = DESTINATIONS.find((d) => d.id === destinationId) || DESTINATIONS[1];
  const featuredPlace = publishedPlaces[0];
  const googleMapsTravelMode = transportMode === 'vehicle'
    ? 'driving'
    : transportMode === 'bus' ? 'transit' : 'walking';

  const { distanceKm, durationHours } = calculateColombianDistance(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
    transportMode
  );

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Este navegador no admite la geolocalización.');
      return;
    }

    setIsLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentLocation({ lat: coords.latitude, lng: coords.longitude });
        setIsLocating(false);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Diste permiso para compartir tu ubicación. Puedes habilitarlo en la configuración del navegador.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'No se pudo determinar tu ubicación. Inténtalo de nuevo.'
            : 'La solicitud de ubicación tardó demasiado. Inténtalo de nuevo.';
        setLocationError(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleStartRoute = () => {
    const mapsUrl = new URL('https://www.google.com/maps/dir/');
    mapsUrl.searchParams.set('api', '1');
    mapsUrl.searchParams.set('origin', `${origin.lat},${origin.lng}`);
    mapsUrl.searchParams.set('destination', `${destination.lat},${destination.lng}`);
    mapsUrl.searchParams.set('travelmode', googleMapsTravelMode);
    window.open(mapsUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  // Inicializar Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [5.5, -74.0],
        zoom: 6,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Actualizar polyline de ruta
    if (mapInstanceRef.current) {
      if (routeLayerRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
      }

      // Generar curva realista
      const midLat = (origin.lat + destination.lat) / 2 + 0.12;
      const midLng = (origin.lng + destination.lng) / 2 - 0.1;
      const points: [number, number][] = [
        [origin.lat, origin.lng],
        [midLat, midLng],
        [destination.lat, destination.lng],
      ];

      const polyline = L.polyline(points, {
        color: transportMode === 'walking'
          ? '#059669'
          : transportMode === 'bus' ? '#2563EB' : '#E67E22',
        weight: 4,
        opacity: 0.85,
        dashArray: transportMode === 'walking' ? '2, 8' : transportMode === 'bus' ? '12, 6' : undefined,
      }).addTo(mapInstanceRef.current);

      routeLayerRef.current = polyline;
      mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    }
  }, [originId, destinationId, transportMode, origin, destination]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (publishedPlacesLayerRef.current) {
      map.removeLayer(publishedPlacesLayerRef.current);
    }

    const markerLayer = L.layerGroup();
    const icon = L.divIcon({
      className: 'custom-map-pin',
      html: '<div style="background:#059669;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px rgba(16,185,129,0.8);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    publishedPlaces.forEach((place) => {
      if (
        !place.is_verified
        || !Number.isFinite(place.latitude)
        || !Number.isFinite(place.longitude)
        || place.latitude < -90
        || place.latitude > 90
        || place.longitude < -180
        || place.longitude > 180
      ) return;

      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = place.name;
      const location = document.createElement('div');
      location.textContent = `${place.city}, ${place.department}`;
      location.style.fontSize = '12px';
      popup.append(title, location);

      L.marker([place.latitude, place.longitude], { icon })
        .bindPopup(popup)
        .addTo(markerLayer);
    });

    markerLayer.addTo(map);
    publishedPlacesLayerRef.current = markerLayer;
  }, [publishedPlaces]);

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section con Layout Asimétrico y Colores Colombianos */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E67E22] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Turismo Inteligente · Colombia 2026</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#F8F6F0] leading-tight tracking-tight font-display">
            Descubre el país de la{' '}
            <span className="bg-gradient-to-r from-[#D4AF37] via-[#E67E22] to-[#E67E22] bg-clip-text text-transparent">
              biodiversidad
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-300 max-w-xl leading-relaxed">
            Explora y traza rutas inteligentes entre cumbres glaciares, valles cafeteros y ciudades
            amuralladas con control estricto de roles (RBAC) y prestadores turísticos certificados.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => {
                document.getElementById('route-planner-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#E67E22] to-[#D35400] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#E67E22]/25 cursor-pointer"
            >
              <Navigation2 className="w-4 h-4" />
              <span>Trazar Ruta Inteligente</span>
            </button>

            <button
              onClick={() => onNavigate('places')}
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#F8F6F0] bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Ver Catálogo de Atractivos</span>
            </button>
          </div>

          {/* Estadísticas / Métricas Editoriales */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10 max-w-lg">
            <div>
              <div className="text-2xl font-black text-[#10B981] tabular-nums font-display">+32</div>
              <div className="text-xs text-neutral-400">Departamentos Conectados</div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#D4AF37] tabular-nums font-display">100%</div>
              <div className="text-xs text-neutral-400">Control de Acceso RBAC</div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#E67E22] tabular-nums font-display">59</div>
              <div className="text-xs text-neutral-400">Parques Nacionales</div>
            </div>
          </div>
        </div>

        {/* Tarjeta Destacada Parque El Cocuy (Bordes curvos modernos 20px) */}
        <div className="lg:col-span-5">
          {featuredPlace ? (
            <div className="relative group bg-[#141b24]/90 backdrop-blur-xl border border-white/10 rounded-[20px] p-2.5 overflow-hidden shadow-2xl transition-all duration-300 hover:border-[#E67E22]/40 hover:scale-[1.01]">
              <div className="relative h-80 rounded-[16px] overflow-hidden">
                <img
                  src={resolvePlaceImageUrl(featuredPlace.image_url)}
                  alt={featuredPlace.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c1017] via-[#0c1017]/40 to-transparent" />
                <div className="absolute top-3 left-3 bg-[#059669]/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  <Mountain className="w-3.5 h-3.5" />
                  <span>{featuredPlace.category} · Verificado</span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="text-xs font-semibold text-[#E67E22] mb-1">
                    {featuredPlace.department}, Colombia
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1.5 font-display">
                    {featuredPlace.name}
                  </h3>
                  <p className="text-xs text-neutral-300 line-clamp-2">{featuredPlace.description}</p>
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                    <span className="text-neutral-400">Entrada</span>
                    <span className="font-bold text-[#F8F6F0]">
                      {featuredPlace.entry_fee > 0
                        ? `$${featuredPlace.entry_fee.toLocaleString()} COP`
                        : 'Libre'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-80 items-center justify-center rounded-[20px] border border-white/10 bg-[#141b24]/80 p-8 text-center text-sm text-neutral-400">
              {isLoadingPlaces
                ? 'Cargando atractivos destacados...'
                : 'Los atractivos aparecerán aquí después de ser aprobados.'}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="published-places-title">
        <div>
          <div className="text-xs font-bold uppercase text-[#10B981] tracking-wider mb-1">
            Publicados por prestadores turísticos
          </div>
          <h2 id="published-places-title" className="text-2xl font-bold text-[#F8F6F0] font-display">
            Atractivos verificados
          </h2>
          <p className="mt-1 text-sm text-neutral-400">
            Lugares aprobados por nuestros administradores, con información e imágenes de sus comerciantes.
          </p>
        </div>

        {isLoadingPlaces && (
          <p className="text-sm text-neutral-400" role="status">Cargando atractivos verificados...</p>
        )}
        {!isLoadingPlaces && placesError && (
          <p className="text-sm text-red-300" role="alert">
            {placesError}{' '}
            <button
              type="button"
              onClick={() => setPlacesReloadKey((key) => key + 1)}
              className="font-semibold underline underline-offset-2 hover:text-white"
            >
              Reintentar
            </button>
          </p>
        )}
        {!isLoadingPlaces && !placesError && publishedPlaces.length === 0 && (
          <p className="text-sm text-neutral-400">Aún no hay atractivos aprobados para mostrar.</p>
        )}
        {publishedPlaces.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {publishedPlaces.map((place) => (
              <article
                key={place.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#141b24]/80 shadow-lg"
              >
                <img
                  src={resolvePlaceImageUrl(place.image_url)}
                  alt={place.name}
                  loading="lazy"
                  className="h-48 w-full object-cover"
                />
                <div className="p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#10B981]">
                    {place.category} · {place.city}, {place.department}
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-white">{place.name}</h3>
                  <p className="mt-2 text-sm text-neutral-400 line-clamp-3">{place.description}</p>
                  <div className="mt-4 border-t border-white/10 pt-3 text-xs text-neutral-300">
                    {place.entry_fee > 0 ? `$${place.entry_fee.toLocaleString()} COP` : 'Entrada libre'}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Planificador de Rutas Interactivo (Leaflet + Modos de Transporte) */}
      <section
        id="route-planner-section"
        className="bg-[#141b24]/75 backdrop-blur-xl border border-white/10 rounded-[20px] p-6 lg:p-8 shadow-2xl relative"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-bold uppercase text-[#E67E22] tracking-wider mb-1">
              Algoritmo de Movilidad Inteligente
            </div>
            <h2 className="text-2xl font-bold text-[#F8F6F0] font-display">
              Calculador de Rutas Turísticas de Colombia
            </h2>
          </div>

          {/* Selector de Transporte con Iconos Modernos Minimalistas */}
          <div className="inline-flex bg-[#0c1017]/80 p-1 rounded-xl border border-white/10 gap-1 self-start sm:self-auto">
            <button
              onClick={() => setTransportMode('vehicle')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                transportMode === 'vehicle'
                  ? 'bg-gradient-to-r from-[#E67E22] to-[#D35400] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Vehículo</span>
            </button>
            <button
              onClick={() => setTransportMode('bus')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                transportMode === 'bus'
                  ? 'bg-gradient-to-r from-[#E67E22] to-[#D35400] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>Autobús</span>
            </button>
            <button
              onClick={() => setTransportMode('walking')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                transportMode === 'walking'
                  ? 'bg-gradient-to-r from-[#059669] to-[#047857] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Caminata</span>
            </button>
          </div>
        </div>

        {/* Controles de Selección de Puntos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 items-end">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Punto de Origen
            </label>
            <select
              value={currentLocation ? 'current-location' : originId}
              onChange={(e) => {
                setCurrentLocation(null);
                setLocationError('');
                setOriginId(e.target.value);
              }}
              className="w-full bg-[#0c1017] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F8F6F0] outline-none focus:border-[#E67E22] transition-colors cursor-pointer"
            >
              {currentLocation && (
                <option value="current-location">Mi Ubicación Actual</option>
              )}
              {DESTINATIONS.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === destinationId}>
                  {d.name} ({d.dept})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981] transition hover:text-emerald-300 disabled:cursor-wait disabled:opacity-60"
            >
              <LocateFixed className={`h-3.5 w-3.5 ${isLocating ? 'animate-pulse' : ''}`} />
              {isLocating ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
            </button>
            {locationError && (
              <p className="mt-1 text-xs text-red-300" role="alert">{locationError}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Punto de Destino
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full bg-[#0c1017] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F8F6F0] outline-none focus:border-[#E67E22] transition-colors cursor-pointer"
            >
              {DESTINATIONS.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === originId}>
                  {d.name} ({d.dept})
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3 flex justify-center">
            <button
              type="button"
              onClick={handleStartRoute}
              className="w-full max-w-xl mx-auto flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#E67E22] to-[#D35400] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#E67E22]/25 cursor-pointer"
            >
              <Navigation2 className="w-4 h-4" />
              <span>Iniciar Ruta</span>
            </button>
          </div>
        </div>

        {/* Mapa Leaflet Interactivo */}
        <div
          ref={mapContainerRef}
          className="w-full h-96 rounded-[16px] overflow-hidden border border-white/10 shadow-inner z-0"
        />

        {/* Tarjetas de Resumen de Ruta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-[#0c1017]/70 border border-white/10 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E67E22]/15 text-[#E67E22] flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                Distancia Estimada
              </div>
              <div className="text-xl font-bold text-[#F8F6F0] tabular-nums font-display">
                {distanceKm} km
              </div>
            </div>
          </div>

          <div className="bg-[#0c1017]/70 border border-white/10 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#059669]/15 text-[#10B981] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                Tiempo de Viaje
              </div>
              <div className="text-xl font-bold text-[#10B981] tabular-nums font-display">
                {durationHours} horas
              </div>
            </div>
          </div>

          <div className="bg-[#0c1017]/70 border border-white/10 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                Modo Activo
              </div>
              <div className="text-xl font-bold text-[#D4AF37] capitalize font-display">
                {transportMode === 'vehicle' ? 'Vehículo' : transportMode === 'bus' ? 'Autobús' : 'Caminata'}
              </div>
            </div>
          </div>
        </div>

        {transportMode === 'bus' && (
          <section className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-md">
            <h3 className="mb-4 text-base font-bold text-[#F8F6F0] font-display">
              Empresas de Transporte Recomendadas
            </h3>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BUS_COMPANIES.map((company) => (
                <li key={company.name}>
                  <a
                    href={company.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-white/[0.08]"
                  >
                    <span className="flex items-center gap-3 text-white font-medium">
                      <Bus aria-hidden="true" className="h-5 w-5 shrink-0 text-orange-500" />
                      <span>{company.name}</span>
                    </span>
                    <span aria-hidden="true" className="text-[#E67E22]">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Recomendaciones Culturales */}
        <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-neutral-300 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-[#E67E22] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Consejo del Viajero:</span> Los pisos térmicos
            en Colombia varían drásticamente. Al ascender de valles a páramos como El Cocuy o Los
            Nevados, viste en capas y consume panela con queso para aclimatación.
          </div>
        </div>
      </section>
    </div>
  );
};
