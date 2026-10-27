/**
 * Lógica pura de Control de Acceso Basado en Roles (RBAC)
 * Turismo Inteligente - Colombia
 */

export type UserRole = 'SuperAdmin' | 'Administrador' | 'Auditor' | 'Comerciante' | 'Turista';

export interface AuditorPermissions {
  ver_rbac: boolean;
  ver_admin: boolean;
  ver_comerciante: boolean;
}

export interface UserSession {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  permisos?: AuditorPermissions | null;
}

export interface PlaceEntity {
  id: number;
  name: string;
  merchantId: number;
  category: string;
}

export const ROLE_LEVELS: Record<UserRole, number> = {
  SuperAdmin: 4,
  Administrador: 3,
  Auditor: 2,
  Comerciante: 2,
  Turista: 1,
};

/**
 * Evalúa si un usuario tiene permiso para acceder a una ruta protegida.
 */
export function canAccessView(
  role: UserRole,
  targetView: 'index' | 'places' | 'merchant' | 'admin' | 'code',
  permissions?: AuditorPermissions | null
): {
  allowed: boolean;
  reason?: string;
} {
  if (targetView === 'index' || targetView === 'places') {
    return { allowed: true };
  }

  if (targetView === 'code') {
    return {
      allowed: role === 'SuperAdmin' || (role === 'Auditor' && permissions?.ver_rbac === true),
    };
  }

  if (targetView === 'merchant') {
    if (role === 'Auditor') {
      return { allowed: permissions?.ver_comerciante === true };
    }
    if (role === 'Turista') {
      return {
        allowed: false,
        reason: 'Los turistas solo tienen permisos de lectura y consulta. El portal de Comerciantes requiere rol Comerciante o Administrador.',
      };
    }
    return { allowed: true };
  }

  if (targetView === 'admin') {
    if (role === 'Auditor') {
      return { allowed: permissions?.ver_admin === true };
    }
    if (role !== 'Administrador' && role !== 'SuperAdmin') {
      return {
        allowed: false,
        reason: `El rol '${role}' no cuenta con privilegios administrativos. Acceso reservado para Administradores y Auditores.`,
      };
    }
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Evalúa si un usuario puede editar o eliminar un lugar turístico específico.
 */
export function canManagePlace(user: UserSession, place: PlaceEntity): {
  canEdit: boolean;
  canDelete: boolean;
  reason?: string;
} {
  // Administrador tiene control total
  if (user.role === 'Administrador' || user.role === 'SuperAdmin') {
    return { canEdit: true, canDelete: true };
  }

  if (user.role === 'Auditor') {
    return {
      canEdit: false,
      canDelete: false,
      reason: 'El rol Auditor tiene acceso de solo lectura.',
    };
  }

  // Comerciante solo puede editar y eliminar sus propios lugares
  if (user.role === 'Comerciante') {
    const isOwner = user.id === place.merchantId;
    return {
      canEdit: isOwner,
      canDelete: isOwner,
      reason: isOwner
        ? undefined
        : 'Como comerciante únicamente puedes modificar los lugares creados por tu cuenta.',
    };
  }

  // Turista no puede crear, editar ni eliminar
  return {
    canEdit: false,
    canDelete: false,
    reason: 'Los turistas tienen acceso estrictamente de solo lectura y favoritos.',
  };
}

/**
 * Calcula distancia de ruta en kilómetros (Haversine con factor topográfico de Colombia).
 */
export function calculateColombianDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  mode: 'vehicle' | 'bus' | 'walking'
): { distanceKm: number; durationHours: number } {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDist = R * c;

  // Topografía montañosa colombiana
  const sinuosity = mode === 'walking' ? 1.15 : 1.35;
  const roadDist = Math.round(directDist * sinuosity * 10) / 10;

  const speeds = {
    vehicle: 55,
    bus: 42,
    walking: 4.5,
  };
  const speed = speeds[mode] || 50;
  const durationHours = Math.round((roadDist / speed) * 10) / 10;

  return { distanceKm: roadDist, durationHours };
}
