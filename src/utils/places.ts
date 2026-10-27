import {
  API_BASE,
  fetchApi,
  getStoredAuthHeaders,
  parseApiResponse,
} from './auth';

export interface ApiPlace {
  id: number;
  name: string;
  description: string;
  category: string;
  department: string;
  city: string;
  latitude: number;
  longitude: number;
  entry_fee: number;
  rating: number;
  image_url: string | null;
  merchant_id: number;
  merchant_name: string;
  is_verified: boolean;
}

function isApiPlace(place: ApiPlace): boolean {
  return Number.isInteger(place.id)
    && Boolean(place.name)
    && Boolean(place.description)
    && Boolean(place.category)
    && Boolean(place.department)
    && Boolean(place.city)
    && Number.isFinite(place.latitude)
    && Number.isFinite(place.longitude)
    && Number.isFinite(place.entry_fee)
    && Number.isFinite(place.rating)
    && (place.image_url === null || typeof place.image_url === 'string')
    && Number.isInteger(place.merchant_id)
    && Boolean(place.merchant_name)
    && typeof place.is_verified === 'boolean';
}

export function resolvePlaceImageUrl(imageUrl: string | null): string {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return new URL(imageUrl, new URL(API_BASE, window.location.origin).origin).toString();
}

async function fetchPlaces(url: string, authenticated: boolean): Promise<ApiPlace[]> {
  const response = await fetchApi(url, {
    headers: authenticated ? getStoredAuthHeaders() : undefined,
  });
  const places = await parseApiResponse<ApiPlace[]>(response);

  if (!Array.isArray(places) || places.some((place) => !isApiPlace(place))) {
    throw new Error('La lista de lugares recibida del servidor no es válida.');
  }

  return places;
}

export async function fetchAdminPlaces(): Promise<ApiPlace[]> {
  return fetchPlaces(`${API_BASE}/places`, true);
}

export async function fetchPublishedPlaces(): Promise<ApiPlace[]> {
  const places = await fetchPlaces(`${API_BASE}/places?verified_only=true`, false);
  return places.filter((place) => place.is_verified);
}

export async function fetchMerchantPlaces(): Promise<ApiPlace[]> {
  return fetchPlaces(`${API_BASE}/places/my-places`, true);
}

export async function uploadPlaceImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetchApi(`${API_BASE}/places/images`, {
    method: 'POST',
    headers: getStoredAuthHeaders(),
    body: formData,
  });
  const result = await parseApiResponse<{ image_url: string }>(response);

  if (typeof result.image_url !== 'string' || !result.image_url.startsWith('/uploads/places/')) {
    throw new Error('El servidor no devolvió una ruta de imagen válida.');
  }

  return result.image_url;
}

export interface CreatePlacePayload {
  name: string;
  description: string;
  category: string;
  department: string;
  city: string;
  latitude: number;
  longitude: number;
  entry_fee: number;
  image_url: string | null;
}

export async function createMerchantPlace(payload: CreatePlacePayload): Promise<ApiPlace> {
  const response = await fetchApi(`${API_BASE}/places`, {
    method: 'POST',
    headers: getStoredAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  const place = await parseApiResponse<ApiPlace>(response);

  if (!isApiPlace(place)) {
    throw new Error('El lugar creado recibido del servidor no es válido.');
  }

  return place;
}

export async function deleteMerchantPlace(placeId: number): Promise<void> {
  const response = await fetchApi(`${API_BASE}/places/${placeId}`, {
    method: 'DELETE',
    headers: getStoredAuthHeaders(),
  });
  if (!response.ok) await parseApiResponse<never>(response);
}

export async function updatePlaceVerification(placeId: number, isVerified: boolean): Promise<ApiPlace> {
  const response = await fetchApi(`${API_BASE}/places/${placeId}/status`, {
    method: 'PATCH',
    headers: getStoredAuthHeaders(true),
    body: JSON.stringify({ is_verified: isVerified }),
  });
  const place = await parseApiResponse<ApiPlace>(response);

  if (!isApiPlace(place) || place.id !== placeId || place.is_verified !== isVerified) {
    throw new Error('El estado actualizado recibido del servidor no es válido.');
  }

  return place;
}
