import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessView, canManagePlace, calculateColombianDistance } from './rbac.ts';

test('RBAC: Turista cannot access admin or merchant views', () => {
  const adminCheck = canAccessView('Turista', 'admin');
  assert.equal(adminCheck.allowed, false);

  const merchantCheck = canAccessView('Turista', 'merchant');
  assert.equal(merchantCheck.allowed, false);

  const placesCheck = canAccessView('Turista', 'places');
  assert.equal(placesCheck.allowed, true);

  const indexCheck = canAccessView('Turista', 'index');
  assert.equal(indexCheck.allowed, true);
});

test('RBAC: Comerciante can access merchant view but cannot access admin view', () => {
  const adminCheck = canAccessView('Comerciante', 'admin');
  assert.equal(adminCheck.allowed, false);

  const merchantCheck = canAccessView('Comerciante', 'merchant');
  assert.equal(merchantCheck.allowed, true);
});

test('RBAC: Administrador has unrestricted access to all views', () => {
  assert.equal(canAccessView('Administrador', 'admin').allowed, true);
  assert.equal(canAccessView('Administrador', 'merchant').allowed, true);
  assert.equal(canAccessView('Administrador', 'places').allowed, true);
  assert.equal(canAccessView('Administrador', 'index').allowed, true);
});

test('RBAC: SuperAdmin inherits admin access and alone can open the source-code view', () => {
  assert.equal(canAccessView('SuperAdmin', 'admin').allowed, true);
  assert.equal(canAccessView('SuperAdmin', 'merchant').allowed, true);
  assert.equal(canAccessView('SuperAdmin', 'code').allowed, true);
  assert.equal(canAccessView('Administrador', 'code').allowed, false);
});

test('RBAC: Auditor view access follows assigned permissions and never allows writes', () => {
  const auditorPermissions = {
    ver_rbac: true,
    ver_admin: true,
    ver_comerciante: true,
  };
  assert.equal(canAccessView('Auditor', 'admin', auditorPermissions).allowed, true);
  assert.equal(canAccessView('Auditor', 'merchant', auditorPermissions).allowed, true);
  assert.equal(canAccessView('Auditor', 'code', auditorPermissions).allowed, true);
  assert.equal(canAccessView('Auditor', 'admin').allowed, false);
  assert.equal(canAccessView('Auditor', 'merchant').allowed, false);
  assert.equal(canAccessView('Auditor', 'code').allowed, false);
  assert.equal(canAccessView('Auditor', 'admin', { ...auditorPermissions, ver_admin: false }).allowed, false);
  assert.equal(canAccessView('Auditor', 'merchant', { ...auditorPermissions, ver_comerciante: false }).allowed, false);
  assert.equal(canAccessView('Auditor', 'code', { ...auditorPermissions, ver_rbac: false }).allowed, false);

  const auditor = { id: 4, email: 'auditor@turismo.co', fullName: 'Auditor', role: 'Auditor' as const };
  const place = { id: 101, name: 'Parque El Cocuy', merchantId: 4, category: 'Aventura' };
  const permissions = canManagePlace(auditor, place);
  assert.equal(permissions.canEdit, false);
  assert.equal(permissions.canDelete, false);
});

test('RBAC: Place management permissions by role and ownership', () => {
  const touristUser = { id: 3, email: 'turista@viajero.com', fullName: 'Mateo', role: 'Turista' as const };
  const merchantUserA = { id: 10, email: 'merchantA@turismo.co', fullName: 'Comerciante A', role: 'Comerciante' as const };
  const merchantUserB = { id: 20, email: 'merchantB@turismo.co', fullName: 'Comerciante B', role: 'Comerciante' as const };
  const adminUser = { id: 1, email: 'admin@turismo.co', fullName: 'Admin', role: 'Administrador' as const };
  const superAdminUser = { id: 2, email: 'superadmin@turismo.co', fullName: 'Super Admin', role: 'SuperAdmin' as const };

  const placeA = { id: 101, name: 'Parque El Cocuy', merchantId: 10, category: 'Aventura' };

  // Tourist cannot edit or delete
  const touristResult = canManagePlace(touristUser, placeA);
  assert.equal(touristResult.canEdit, false);
  assert.equal(touristResult.canDelete, false);

  // Merchant A owns placeA -> can edit & delete
  const merchantAResult = canManagePlace(merchantUserA, placeA);
  assert.equal(merchantAResult.canEdit, true);
  assert.equal(merchantAResult.canDelete, true);

  // Merchant B does not own placeA -> cannot edit or delete
  const merchantBResult = canManagePlace(merchantUserB, placeA);
  assert.equal(merchantBResult.canEdit, false);
  assert.equal(merchantBResult.canDelete, false);

  // Admin can edit & delete regardless of ownership
  const adminResult = canManagePlace(adminUser, placeA);
  assert.equal(adminResult.canEdit, true);
  assert.equal(adminResult.canDelete, true);
  assert.equal(canManagePlace(superAdminUser, placeA).canEdit, true);
  assert.equal(canManagePlace(superAdminUser, placeA).canDelete, true);
});

test('Routing: Calculates realistic distance and duration for Colombia topography', () => {
  // Bogotá to Guatapé
  const result = calculateColombianDistance(4.5981, -74.0758, 6.2328, -75.1565, 'vehicle');
  assert.ok(result.distanceKm > 200, 'Distance should be greater than 200km');
  assert.ok(result.durationHours > 3, 'Duration in vehicle should be realistic');
});
