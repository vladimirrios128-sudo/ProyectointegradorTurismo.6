import React, { useState, useEffect } from 'react';
import { UserRole } from '../utils/rbac';
import { ApiPlace, fetchPublishedPlaces, resolvePlaceImageUrl } from '../utils/places';
import {
  Search,
  Heart,
  Mountain,
  Palette,
  Landmark,
  Layers,
  ArrowRight,
  Sparkles,
  X,
  Star,
  MapPin,
  CloudSun,
  Snowflake,
} from 'lucide-react';

interface PlaceItem {
  id: number;
  name: string;
  description: string;
  category: string;
  department: string;
  city: string;
  entryFee: number;
  rating: number;
  imageUrl: string;
}

function toPlaceItem(place: ApiPlace): PlaceItem {
  return {
    id: place.id,
    name: place.name,
    description: place.description,
    category: place.category,
    department: place.department,
    city: place.city,
    entryFee: place.entry_fee,
    rating: place.rating,
    imageUrl: resolvePlaceImageUrl(place.image_url),
  };
}

interface PlacesViewProps {
  currentRole: UserRole;
  onTriggerAlert: (title: string, message: string, isWarning?: boolean) => void;
}

export const PlacesView: React.FC<PlacesViewProps> = ({ currentRole, onTriggerAlert }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [placesError, setPlacesError] = useState('');
  const [placesReloadKey, setPlacesReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setPlacesError('');

    fetchPublishedPlaces()
      .then((apiPlaces) => {
        if (isMounted) setPlaces(apiPlaces.map(toPlaceItem));
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setPlacesError(error instanceof Error ? error.message : 'No se pudieron cargar los atractivos verificados.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [placesReloadKey]);

  const handleToggleFavorite = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorites.includes(id)) {
      setFavorites(favorites.filter((f) => f !== id));
      onTriggerAlert('Favoritos', 'Lugar removido de tu lista personal.', true);
    } else {
      setFavorites([...favorites, id]);
      onTriggerAlert('Favoritos', 'Lugar guardado en tus favoritos con éxito.', false);
    }
  };

  const filteredPlaces = places.filter((p) => {
    const matchCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFav = !showOnlyFavorites || favorites.includes(p.id);
    return matchCategory && matchSearch && matchFav;
  });

  return (
    <div className="py-8 space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E67E22] uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Patrimonio Natural y Cultural</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F8F6F0] font-display">
            Atractivos Turísticos de Colombia
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-xl">
            Filtra por categorías de aventura, historia o cultura. Los turistas pueden guardar
            favoritos y consultar detalles de cada destino.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Barra de Búsqueda */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por parque o ciudad..."
              className="w-full bg-[#141b24] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#F8F6F0] outline-none focus:border-[#E67E22] transition-colors"
            />
          </div>

          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showOnlyFavorites
                ? 'bg-[#E67E22] text-white border-[#E67E22] shadow-md shadow-[#E67E22]/20'
                : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-current' : 'text-red-400'}`} />
            <span>Favoritos ({favorites.length})</span>
          </button>
        </div>
      </div>

      {/* Selector de Categorías (Botones funcionales con estilos culturales) */}
      <div className="flex flex-wrap gap-2.5 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('Todos')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'Todos'
                ? 'bg-[#E67E22] text-white shadow-md'
                : 'bg-[#141b24] border border-white/10 text-neutral-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos</span>
          </button>

          <button
            onClick={() => setSelectedCategory('Aventura')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'Aventura'
                ? 'bg-[#059669] text-white shadow-md'
                : 'bg-[#141b24] border border-white/10 text-neutral-300 hover:text-[#10B981]'
            }`}
          >
            <Mountain className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Aventura & Naturaleza</span>
          </button>

          <button
            onClick={() => setSelectedCategory('Cultural')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'Cultural'
                ? 'bg-[#E67E22] text-white shadow-md'
                : 'bg-[#141b24] border border-white/10 text-neutral-300 hover:text-[#E67E22]'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-[#E67E22]" />
            <span>Cultural</span>
          </button>

          <button
            onClick={() => setSelectedCategory('Histórico')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'Histórico'
                ? 'bg-[#D4AF37] text-neutral-900 shadow-md font-bold'
                : 'bg-[#141b24] border border-white/10 text-neutral-300 hover:text-[#D4AF37]'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Histórico</span>
          </button>
        </div>

      </div>

      {/* Grid con Skeleton Loaders o Cards Reales */}
      {placesError ? (
        <div className="rounded-[20px] border border-red-400/20 bg-[#141b24]/60 p-8 text-center">
          <p className="text-sm text-red-300" role="alert">{placesError}</p>
          <button
            type="button"
            onClick={() => setPlacesReloadKey((key) => key + 1)}
            className="mt-3 rounded-xl bg-white/5 px-4 py-2 text-xs font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-[#141b24]/60 border border-white/10 rounded-[20px] overflow-hidden p-4 space-y-4 animate-pulse"
            >
              <div className="h-52 bg-white/10 rounded-[16px]" />
              <div className="space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-5 bg-white/10 rounded w-4/5" />
                <div className="h-3 bg-white/10 rounded w-full" />
                <div className="h-3 bg-white/10 rounded w-2/3" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 bg-white/10 rounded w-1/4" />
                <div className="h-8 bg-white/10 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="bg-[#141b24]/60 border border-white/10 rounded-[20px] p-12 text-center max-w-md mx-auto">
          <MapPin className="w-12 h-12 text-neutral-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No se encontraron atractivos</h3>
          <p className="text-xs text-neutral-400 mb-4">
            Ajusta los términos de búsqueda o cambia la categoría seleccionada.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Todos');
              setShowOnlyFavorites(false);
            }}
            className="px-4 py-2 bg-[#E67E22] text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaces.map((place) => {
            const isFav = favorites.includes(place.id);
            return (
              <div
                key={place.id}
                onClick={() => setSelectedPlace(place)}
                className="group bg-[#141b24]/80 backdrop-blur-md border border-white/10 rounded-[20px] overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] hover:border-[#E67E22]/40 hover:shadow-2xl shadow-black/50 cursor-pointer"
              >
                {/* Media Container con Esquinas Curvas 16px+ */}
                <div className="relative h-56 overflow-hidden bg-[#0c1017]">
                  <img
                    src={place.imageUrl}
                    alt={place.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c1017]/80 via-transparent to-transparent" />

                  {/* Badge de Categoría con Colores Culturales */}
                  <div
                    className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md backdrop-blur-md ${
                      place.category === 'Aventura'
                        ? 'bg-[#059669]/90 text-white'
                        : place.category === 'Cultural'
                        ? 'bg-[#E67E22]/90 text-white'
                        : 'bg-[#D4AF37]/90 text-neutral-900 font-extrabold'
                    }`}
                  >
                    {place.category === 'Aventura' ? (
                      <Mountain className="w-3 h-3" />
                    ) : place.category === 'Cultural' ? (
                      <Palette className="w-3 h-3" />
                    ) : (
                      <Landmark className="w-3 h-3" />
                    )}
                    <span>{place.category}</span>
                  </div>

                  {/* Botón de Favorito */}
                  <button
                    onClick={(e) => handleToggleFavorite(place.id, e)}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer ${
                      isFav
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-[#0c1017]/60 text-white hover:scale-110 hover:text-red-400'
                    }`}
                    title="Añadir a favoritos"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>

                  <div className="absolute bottom-2.5 left-3 text-xs font-semibold text-neutral-300">
                    {place.city}, {place.department}
                  </div>
                </div>

                {/* Contenido de la Tarjeta */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1 text-xs font-bold text-[#D4AF37]">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{place.rating}</span>
                      </div>
                      <span className="text-[11px] text-neutral-400">Verificado</span>
                    </div>

                    <h3 className="text-lg font-bold text-[#F8F6F0] group-hover:text-[#E67E22] transition-colors font-display line-clamp-1">
                      {place.name}
                    </h3>

                    <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                      {place.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Aporte de Ingreso
                      </div>
                      <div className="text-sm font-bold text-[#F8F6F0] tabular-nums font-display">
                        {place.entryFee > 0 ? `$${place.entryFee.toLocaleString()} COP` : 'Ingreso Libre'}
                      </div>
                    </div>

                    <button className="flex items-center gap-1 text-xs font-semibold text-[#E67E22] group-hover:translate-x-1 transition-transform">
                      <span>Detalles</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detalle de Lugar con Glassmorphism */}
      {selectedPlace && (
        <div className="fixed inset-0 z-50 bg-[#0c1017]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141b24] border border-white/15 rounded-[24px] max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedPlace(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative h-64 rounded-[16px] overflow-hidden mb-4">
              <img
                src={selectedPlace.imageUrl}
                alt={selectedPlace.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-[#E67E22] text-white px-2.5 py-1 rounded-lg text-xs font-bold uppercase">
                {selectedPlace.category}
              </div>
              {selectedPlace.name.includes('Cocuy') && (
                <div className="absolute top-3 right-3 bg-[#0c1017]/75 backdrop-blur-md border border-white/15 rounded-xl px-2.5 py-1.5 shadow-lg flex items-center gap-2 text-xs text-[#F8F6F0]">
                  <div className="flex items-center gap-1">
                    <CloudSun className="w-4 h-4 text-[#D4AF37]" />
                    <span className="font-extrabold tabular-nums">4°C</span>
                  </div>
                  <div className="w-px h-3.5 bg-white/20" />
                  <div className="flex items-center gap-1 text-[11px] text-neutral-300">
                    <Snowflake className="w-3 h-3 text-sky-400" />
                    <span>1° / 8°C</span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-[#E67E22] font-semibold mb-1">
              {selectedPlace.city}, {selectedPlace.department}
            </div>
            <h2 className="text-2xl font-bold text-white font-display mb-2">{selectedPlace.name}</h2>
            <p className="text-xs text-neutral-300 leading-relaxed mb-6">
              {selectedPlace.description}
            </p>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#0c1017]/80 border border-white/10 mb-6">
              <div>
                <span className="text-[11px] text-neutral-400 block">Calificación</span>
                <span className="text-base font-bold text-[#D4AF37]">★ {selectedPlace.rating} / 5.0</span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-400 block">Tarifa Sugerida</span>
                <span className="text-base font-bold text-[#F8F6F0]">
                  {selectedPlace.entryFee > 0
                    ? `$${selectedPlace.entryFee.toLocaleString()} COP`
                    : 'Ingreso Gratuito'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedPlace(null)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#E67E22] rounded-xl hover:bg-[#D35400] transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
