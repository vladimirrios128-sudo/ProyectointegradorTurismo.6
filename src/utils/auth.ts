import { AuditorPermissions, UserRole, UserSession } from './rbac';

export const AUTH_TOKEN_KEY = 'turismo_token';
export const AUTH_USER_KEY = 'turismo_user';
export const API_BASE = import.meta.env.VITE_API_BASE_URL
  || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
    : '/api/v1');

const VALID_ROLES: UserRole[] = ['SuperAdmin', 'Administrador', 'Auditor', 'Comerciante', 'Turista'];

export interface ApiUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  permisos?: AuditorPermissions | null;
}

interface LoginResponse {
  access_token: string;
  role: UserRole;
  user_id: number;
  full_name: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function fetchApi(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`No se pudo conectar con la API en ${API_BASE}. Verifica que FastAPI esté ejecutándose.`);
    }
    throw error;
  }
}

export function clearStoredSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('El servidor devolvió una respuesta no válida.');
  }

  if (!response.ok) {
    const errorData = data as { detail?: string | { msg?: string }[] } | null;
    const detail = errorData?.detail;
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((item) => item.msg).filter(Boolean).join(' ')
        : 'No se pudo completar la solicitud.';
    throw new ApiError(message, response.status);
  }

  return data as T;
}

function toUserSession(user: ApiUser): UserSession {
  if (!Number.isInteger(user.id) || !user.email || !user.full_name || !VALID_ROLES.includes(user.role)) {
    throw new Error('El perfil de usuario recibido del servidor no es válido.');
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    permisos: user.permisos ?? null,
  };
}

export async function fetchCurrentUser(token: string): Promise<UserSession> {
  const response = await fetchApi(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return toUserSession(await parseApiResponse<ApiUser>(response));
}

export function getStoredAuthHeaders(includeJsonContentType = false): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente para administrar usuarios.');
  }

  return {
    Authorization: `Bearer ${token}`,
    ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
  };
}

export async function fetchAdminUsers(): Promise<ApiUser[]> {
  const response = await fetchApi(`${API_BASE}/auth/users`, {
    headers: getStoredAuthHeaders(),
  });
  const users = await parseApiResponse<ApiUser[]>(response);

  if (!Array.isArray(users) || users.some((user) => (
    !Number.isInteger(user.id)
    || !user.email
    || !user.full_name
    || !VALID_ROLES.includes(user.role)
    || typeof user.is_active !== 'boolean'
  ))) {
    throw new Error('La lista de usuarios recibida del servidor no es válida.');
  }

  return users;
}

export async function createAdminUser(payload: {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  permisos?: AuditorPermissions | null;
}): Promise<ApiUser> {
  const response = await fetchApi(`${API_BASE}/auth/users`, {
    method: 'POST',
    headers: getStoredAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  const user = await parseApiResponse<ApiUser>(response);

  if (
    !Number.isInteger(user.id)
    || !user.email
    || !user.full_name
    || !VALID_ROLES.includes(user.role)
    || typeof user.is_active !== 'boolean'
  ) {
    throw new Error('El usuario creado recibido del servidor no es válido.');
  }

  return user;
}

export async function updateAdminUserRole(userId: number, role: UserRole): Promise<ApiUser> {
  const response = await fetchApi(`${API_BASE}/auth/users/${userId}/role`, {
    method: 'PATCH',
    headers: getStoredAuthHeaders(true),
    body: JSON.stringify({ role }),
  });
  const user = await parseApiResponse<ApiUser>(response);

  if (
    !Number.isInteger(user.id)
    || user.id !== userId
    || !user.email
    || !user.full_name
    || !VALID_ROLES.includes(user.role)
    || typeof user.is_active !== 'boolean'
  ) {
    throw new Error('El usuario actualizado recibido del servidor no es válido.');
  }

  return user;
}

export async function authenticate(email: string, password: string): Promise<{ token: string; user: UserSession }> {
  const response = await fetchApi(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const result = await parseApiResponse<LoginResponse>(response);

  if (!result.access_token || !VALID_ROLES.includes(result.role)) {
    throw new Error('El servidor no devolvió una sesión válida.');
  }

  const user = await fetchCurrentUser(result.access_token);
  if (user.role !== result.role || user.id !== result.user_id) {
    throw new Error('El perfil y el token no coinciden. Vuelve a iniciar sesión.');
  }
  return { token: result.access_token, user };
}

export async function registerAccount(payload: {
  email: string;
  full_name: string;
  password: string;
  role: Exclude<UserRole, 'Administrador' | 'Auditor' | 'SuperAdmin'>;
}): Promise<void> {
  const response = await fetchApi(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await parseApiResponse<ApiUser>(response);
}
