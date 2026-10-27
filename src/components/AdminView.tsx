import React, { FormEvent, useEffect, useState } from 'react';
import { AuditorPermissions, UserRole } from '../utils/rbac';
import { createAdminUser, fetchAdminUsers, updateAdminUserRole } from '../utils/auth';
import { ApiPlace, fetchAdminPlaces, updatePlaceVerification } from '../utils/places';
import { SecurityAuditPanel } from './SecurityAuditPanel';
import {
  ShieldCheck,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Layers,
  Loader2,
  Plus,
  X,
} from 'lucide-react';

interface SystemUser {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface AdminViewProps {
  currentRole: UserRole;
  permissions?: AuditorPermissions | null;
  onNavigate: (view: 'index' | 'places' | 'merchant' | 'admin' | 'code') => void;
  onTriggerAlert: (title: string, message: string, isWarning?: boolean) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentRole,
  permissions,
  onNavigate,
  onTriggerAlert,
}) => {
  const isAuditor = currentRole === 'Auditor';
  const hasAdminReadPermission = !isAuditor || permissions?.ver_admin === true;
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [usersReloadKey, setUsersReloadKey] = useState(0);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'Turista' as UserRole,
    permisos: {
      ver_rbac: false,
      ver_admin: false,
      ver_comerciante: false,
    } satisfies AuditorPermissions,
  });
  const [places, setPlaces] = useState<ApiPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [placesError, setPlacesError] = useState('');
  const [updatingPlaceId, setUpdatingPlaceId] = useState<number | null>(null);
  const [placesReloadKey, setPlacesReloadKey] = useState(0);

  useEffect(() => {
    if (!isCreateUserModalOpen) return undefined;

    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isCreateUserModalOpen]);

  useEffect(() => {
    if (!hasAdminReadPermission) {
      setIsLoadingUsers(false);
      return;
    }
    let isMounted = true;
    setIsLoadingUsers(true);
    setUsersError('');

    fetchAdminUsers()
      .then((apiUsers) => {
        if (!isMounted) return;
        setUsers(apiUsers.map((user) => ({
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          isActive: user.is_active,
        })));
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setUsersError(error instanceof Error ? error.message : 'No se pudo cargar la lista de usuarios.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingUsers(false);
      });

    return () => { isMounted = false; };
  }, [hasAdminReadPermission, usersReloadKey]);

  useEffect(() => {
    if (!hasAdminReadPermission) {
      setIsLoadingPlaces(false);
      return;
    }
    let isMounted = true;
    setIsLoadingPlaces(true);
    setPlacesError('');

    fetchAdminPlaces()
      .then((apiPlaces) => {
        if (isMounted) setPlaces(apiPlaces);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setPlacesError(error instanceof Error ? error.message : 'No se pudieron cargar los atractivos.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlaces(false);
      });

    return () => { isMounted = false; };
  }, [hasAdminReadPermission, placesReloadKey]);

  // Verificación estricta de RBAC: Solo Administrador
  if (
    (currentRole !== 'Administrador' && currentRole !== 'SuperAdmin' && !isAuditor)
    || !hasAdminReadPermission
  ) {
    return (
      <div className="py-16 max-w-xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-[#D4AF37] flex items-center justify-center mx-auto border border-amber-500/30 shadow-lg">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white font-display">
            {isAuditor ? 'Permiso de Administración no asignado' : 'Acceso Restringido a Administradores'}
          </h2>
          <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
            {isAuditor
              ? 'El SuperAdmin debe habilitar el permiso de lectura de Administración para tu cuenta.'
              : <>Tu sesión activa está identificada con el rol <strong className="text-white">'{currentRole}'</strong>. La consola de moderación global y control de usuarios requiere privilegios de Administrador (Nivel 3) o SuperAdmin.</>}
          </p>
        </div>
        <div className="pt-4 flex justify-center gap-3">
          <button
            onClick={() => onNavigate('index')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#E67E22] hover:bg-[#D35400] transition-colors cursor-pointer"
          >
            Volver al Inicio
          </button>
          <button
            onClick={() => {
              onTriggerAlert(
                'Acceso Administrativo',
                'Cambia el selector de rol en la barra superior a "Administrador" para probar esta pantalla.',
                false
              );
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Instrucciones de Prueba
          </button>
        </div>
      </div>
    );
  }

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    const currentUser = users.find((user) => user.id === userId);
    if (!currentUser || currentUser.role === newRole) return;

    setUpdatingUserId(userId);
    setUsersError('');
    try {
      const updatedUser = await updateAdminUserRole(userId, newRole);
      setUsers((currentUsers) => currentUsers.map((user) => (
        user.id === updatedUser.id
          ? { ...user, role: updatedUser.role, fullName: updatedUser.full_name, email: updatedUser.email }
          : user
      )));
      onTriggerAlert(
        'Rol Actualizado por Administrador',
        `${updatedUser.full_name} ahora posee el rol '${updatedUser.role}'.`,
        false
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el rol.';
      setUsersError(message);
      onTriggerAlert('No se pudo actualizar el rol', message, true);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingUser(true);
    setCreateUserError('');
    try {
      const createdUser = await createAdminUser({
        ...newUser,
        permisos: newUser.role === 'Auditor' ? newUser.permisos : null,
      });
      setUsersReloadKey((key) => key + 1);
      setIsCreateUserModalOpen(false);
      setNewUser({
        full_name: '',
        email: '',
        password: '',
        role: 'Turista',
        permisos: { ver_rbac: false, ver_admin: false, ver_comerciante: false },
      });
      onTriggerAlert(
        'Usuario creado',
        `${createdUser.full_name} fue creado con el rol '${createdUser.role}'.`,
        false
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el usuario.';
      setCreateUserError(message);
      onTriggerAlert('No se pudo crear el usuario', message, true);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const togglePlaceVerification = async (place: ApiPlace) => {
    const nextState = !place.is_verified;
    setUpdatingPlaceId(place.id);
    setPlacesError('');
    try {
      const updatedPlace = await updatePlaceVerification(place.id, nextState);
      setPlaces((currentPlaces) => currentPlaces.map((currentPlace) => (
        currentPlace.id === updatedPlace.id ? updatedPlace : currentPlace
      )));
      onTriggerAlert(
        nextState ? 'Atractivo Aprobado' : 'Verificación Revocada',
        `Estado de verificación actualizado para "${updatedPlace.name}".`,
        false
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar la verificación.';
      setPlacesError(message);
      onTriggerAlert('No se pudo actualizar el atractivo', message, true);
    } finally {
      setUpdatingPlaceId(null);
    }
  };

  return (
    <div className="py-8 space-y-12">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>{isAuditor ? 'Acceso de Solo Lectura · Auditor' : 'Nivel de Seguridad Máximo · Superusuario'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F8F6F0] font-display">
            Consola Central de Administración
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-xl">
            {isAuditor
              ? 'Consulta de usuarios y atractivos con permisos de solo lectura.'
              : 'Control de usuarios con RBAC jerárquico, moderación de atractivos creados por comerciantes'}
            {!isAuditor && ' y auditoría de permisos del sistema.'}
          </p>
        </div>
      </div>

      {/* Métricas del Sistema */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[#141b24]/80 border border-white/10 rounded-2xl p-5 shadow-lg">
          <div className="text-xs text-neutral-400">Total Usuarios Registrados</div>
          <div className="text-3xl font-extrabold text-white mt-1 tabular-nums font-display">
            {users.length}
          </div>
          <div className="text-[11px] text-[#10B981] mt-2 font-semibold">
            Activos en el sistema
          </div>
        </div>

        <div className="bg-[#141b24]/80 border border-white/10 rounded-2xl p-5 shadow-lg">
          <div className="text-xs text-neutral-400">Atractivos en Moderación</div>
          <div className="text-3xl font-extrabold text-[#E67E22] mt-1 tabular-nums font-display">
            {places.length}
          </div>
          <div className="text-[11px] text-[#D4AF37] mt-2 font-semibold">
            {places.filter((place) => !place.is_verified).length} pendientes de revisión
          </div>
        </div>

        <div className="bg-[#141b24]/80 border border-white/10 rounded-2xl p-5 shadow-lg">
          <div className="text-xs text-neutral-400">Políticas de Seguridad</div>
          <div className="text-3xl font-extrabold text-[#D4AF37] mt-1 font-display">RBAC Estricto</div>
          <div className="text-[11px] text-neutral-300 mt-2 font-semibold">
            {isAuditor ? 'Acceso de solo lectura (Auditor)' : 'RBAC estricto en FastAPI'}
          </div>
        </div>
      </div>

      {/* Moderación de Lugares */}
      <section className="bg-[#141b24]/80 backdrop-blur-md border border-white/10 rounded-[20px] p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-display">
          <Layers className="w-5 h-5 text-[#E67E22]" />
          <span>Moderación y Verificación de Atractivos</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Lugar</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Ubicación</th>
                <th className="py-3 px-4">Comerciante</th>
                <th className="py-3 px-4">Estado Verificación</th>
                {!isAuditor && <th className="py-3 px-4 text-right">Acción Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoadingPlaces && (
                <tr>
                  <td colSpan={isAuditor ? 5 : 6} className="py-6 px-4 text-center text-neutral-400">
                    Cargando atractivos desde el servidor...
                  </td>
                </tr>
              )}
              {!isLoadingPlaces && placesError && (
                <tr>
                  <td colSpan={isAuditor ? 5 : 6} className="py-4 px-4 text-center text-red-300">
                    {placesError}{' '}
                    <button
                      type="button"
                      onClick={() => setPlacesReloadKey((key) => key + 1)}
                      className="font-semibold underline underline-offset-2 hover:text-white"
                    >
                      Reintentar
                    </button>
                  </td>
                </tr>
              )}
              {!isLoadingPlaces && !placesError && places.length === 0 && (
                <tr>
                  <td colSpan={isAuditor ? 5 : 6} className="py-6 px-4 text-center text-neutral-400">
                    No hay atractivos registrados.
                  </td>
                </tr>
              )}
              {places.map((place) => (
                <tr key={place.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-semibold text-white">{place.name}</td>
                  <td className="py-3.5 px-4 text-emerald-400">{place.category}</td>
                  <td className="py-3.5 px-4 text-neutral-300">{place.city}, {place.department}</td>
                  <td className="py-3.5 px-4 text-neutral-400">{place.merchant_name}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      place.is_verified ? 'text-[#10B981]' : 'text-[#D4AF37]'
                    }`}>
                      {place.is_verified
                        ? <CheckCircle className="w-3.5 h-3.5" />
                        : <AlertTriangle className="w-3.5 h-3.5" />}
                      <span>{place.is_verified ? 'Verificado' : 'En Revisión'}</span>
                    </span>
                  </td>
                  {!isAuditor && (
                    <td className="py-3.5 px-4 text-right">
                      <button
                      type="button"
                      onClick={() => togglePlaceVerification(place)}
                      disabled={updatingPlaceId !== null}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
                        place.is_verified
                          ? 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10'
                          : 'bg-[#E67E22] hover:bg-[#D35400] text-white'
                      }`}
                    >
                      {updatingPlaceId === place.id
                        ? 'Guardando...'
                        : place.is_verified ? 'Revocar' : 'Aprobar Lugar'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Control Jerárquico de Usuarios */}
      <section className="bg-[#141b24]/80 backdrop-blur-md border border-white/10 rounded-[20px] p-6 shadow-xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            <span>Gestión de Usuarios y Asignación de Roles</span>
          </h2>
          {currentRole === 'SuperAdmin' && (
            <button
              type="button"
              onClick={() => {
                setCreateUserError('');
                setIsCreateUserModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-4 py-2 text-xs font-bold text-[#F5D76E] shadow-lg shadow-black/20 transition-colors hover:bg-[#D4AF37]/25"
            >
              <Plus className="h-4 w-4" />
              Crear Usuario
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Correo Electrónico</th>
                <th className="py-3 px-4">Rol Asignado</th>
                <th className="py-3 px-4">Nivel Privilegio</th>
                {!isAuditor && <th className="py-3 px-4 text-right">Cambiar Rol (Admin)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoadingUsers && (
                <tr>
                  <td colSpan={isAuditor ? 4 : 5} className="py-6 px-4 text-center text-neutral-400">
                    Cargando usuarios desde el servidor...
                  </td>
                </tr>
              )}
              {!isLoadingUsers && usersError && (
                <tr>
                  <td colSpan={isAuditor ? 4 : 5} className="py-4 px-4 text-center text-red-300">
                    {usersError}{' '}
                    <button
                      type="button"
                      onClick={() => setUsersReloadKey((key) => key + 1)}
                      className="font-semibold underline underline-offset-2 hover:text-white"
                    >
                      Reintentar
                    </button>
                  </td>
                </tr>
              )}
              {!isLoadingUsers && !usersError && users.length === 0 && (
                <tr>
                  <td colSpan={isAuditor ? 4 : 5} className="py-6 px-4 text-center text-neutral-400">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-semibold text-white">{user.fullName}</td>
                  <td className="py-3.5 px-4 text-neutral-400">{user.email}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        user.role === 'SuperAdmin'
                          ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
                          : user.role === 'Administrador'
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37]'
                          : user.role === 'Auditor'
                          ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                          : user.role === 'Comerciante'
                          ? 'bg-[#059669]/20 border-[#059669]/40 text-[#10B981]'
                          : 'bg-[#E67E22]/20 border-[#E67E22]/40 text-[#E67E22]'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-neutral-300">
                    {user.role === 'SuperAdmin'
                      ? 'Nivel 4 (SuperAdmin)'
                      : user.role === 'Administrador'
                      ? 'Nivel 3 (Acceso Total)'
                      : user.role === 'Auditor'
                      ? 'Nivel 2 (Solo lectura)'
                      : user.role === 'Comerciante'
                      ? 'Nivel 2 (Crear/Editar propios)'
                      : 'Nivel 1 (Solo lectura y favoritos)'}
                  </td>
                      {!isAuditor && (
                        <td className="py-3.5 px-4 text-right">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                            disabled={isLoadingUsers || updatingUserId !== null}
                            className="bg-[#0c1017] border border-white/10 text-white text-xs rounded-lg px-2.5 py-1 outline-none cursor-pointer focus:border-[#D4AF37]"
                          >
                            <option value="Turista">Turista</option>
                            <option value="Auditor">Auditor</option>
                            <option value="Comerciante">Comerciante</option>
                            <option value="Administrador">Administrador</option>
                            {(currentRole === 'SuperAdmin' || user.role === 'SuperAdmin') && (
                              <option value="SuperAdmin" disabled={currentRole !== 'SuperAdmin'}>
                                SuperAdmin
                              </option>
                            )}
                          </select>
                        </td>
                      )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <SecurityAuditPanel currentRole={currentRole} />

      {isCreateUserModalOpen && currentRole === 'SuperAdmin' && (
        <div
          className="fixed inset-0 z-[100] grid max-h-screen place-items-center overflow-y-auto bg-[#05080c]/75 p-4 backdrop-blur-xl"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCreatingUser) {
              setIsCreateUserModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-[24px] border border-[#D4AF37]/25 bg-[#141b24]/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-2xl overscroll-contain sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="create-user-title" className="text-xl font-bold text-white font-display">
                  Crear nuevo usuario
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Registra una cuenta y asigna su rol en el sistema.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                disabled={isCreatingUser}
                onClick={() => setIsCreateUserModalOpen(false)}
                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <label className="block space-y-1.5 text-sm text-neutral-300">
                <span>Nombre completo</span>
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={newUser.full_name}
                  onChange={(event) => setNewUser({ ...newUser, full_name: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0c1017]/80 px-3.5 py-2.5 text-white outline-none transition-colors focus:border-[#D4AF37]/60"
                />
              </label>
              <label className="block space-y-1.5 text-sm text-neutral-300">
                <span>Correo electrónico</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  maxLength={100}
                  pattern="(?!.*--)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                  value={newUser.email}
                  onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0c1017]/80 px-3.5 py-2.5 text-white outline-none transition-colors focus:border-[#D4AF37]/60"
                />
              </label>
              <label className="block space-y-1.5 text-sm text-neutral-300">
                <span>Contraseña</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  maxLength={64}
                  pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).+"
                  autoComplete="new-password"
                  value={newUser.password}
                  onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0c1017]/80 px-3.5 py-2.5 text-white outline-none transition-colors focus:border-[#D4AF37]/60"
                />
                <span className="block text-xs text-neutral-500">
                  Entre 8 y 64 caracteres, con mayúscula, minúscula, número y un carácter especial (@$!%*?&).
                </span>
              </label>
              <label className="block space-y-1.5 text-sm text-neutral-300">
                <span>Rol</span>
                <select
                  value={newUser.role}
                  onChange={(event) => setNewUser({ ...newUser, role: event.target.value as UserRole })}
                  className="w-full rounded-xl border border-white/10 bg-[#0c1017] px-3.5 py-2.5 text-white outline-none transition-colors focus:border-[#D4AF37]/60"
                >
                  <option value="SuperAdmin">SuperAdmin</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Auditor">Auditor</option>
                  <option value="Comerciante">Comerciante</option>
                  <option value="Turista">Turista</option>
                </select>
              </label>
              {newUser.role === 'Auditor' && (
                <fieldset className="space-y-3 rounded-2xl border border-sky-400/20 bg-white/[0.04] p-4 backdrop-blur-md">
                  <legend className="px-2 text-sm font-semibold text-sky-200">
                    Permisos de lectura del Auditor
                  </legend>
                  {([
                    ['ver_admin', 'Acceso a Administración'],
                    ['ver_rbac', 'Acceso a Archivos RBAC'],
                    ['ver_comerciante', 'Acceso a Portal Comerciante'],
                  ] as const).map(([permission, label]) => (
                    <label key={permission} className="flex cursor-pointer items-center gap-3 text-sm text-neutral-200">
                      <input
                        type="checkbox"
                        checked={newUser.permisos[permission]}
                        onChange={(event) => setNewUser({
                          ...newUser,
                          permisos: {
                            ...newUser.permisos,
                            [permission]: event.target.checked,
                          },
                        })}
                        className="h-4 w-4 rounded border-white/20 bg-[#0c1017] accent-sky-400"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
              )}

              {createUserError && (
                <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
                  {createUserError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isCreatingUser}
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-neutral-300 transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#E67E22] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#D35400] disabled:cursor-wait disabled:opacity-60"
                >
                  {isCreatingUser && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCreatingUser ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
