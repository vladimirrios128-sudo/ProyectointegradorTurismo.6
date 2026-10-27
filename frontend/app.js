/**
 * Turismo Inteligente - Colombia
 * Autenticación, sesión y control de acceso basado en roles.
 */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
  : '/api/v1';

const VALID_ROLES = ['Administrador', 'Comerciante', 'Turista'];
const TOKEN_KEY = 'turismo_token';
const USER_KEY = 'turismo_user';

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function decodeToken(token) {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;

    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
    const bytes = Uint8Array.from(atob(paddedBase64), (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    console.warn('No se pudo interpretar el token de sesión.', error);
    return null;
  }
}

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;

  const claims = decodeToken(token);
  if (!claims || !VALID_ROLES.includes(claims.role) || !claims.sub) {
    clearSession();
    return null;
  }

  if (claims.exp && claims.exp * 1000 <= Date.now()) {
    clearSession();
    return null;
  }

  let savedUser = {};
  const storedUser = localStorage.getItem(USER_KEY);
  if (storedUser) {
    try {
      savedUser = JSON.parse(storedUser);
    } catch (error) {
      console.warn('No se pudo interpretar el perfil guardado.', error);
    }
  }

  return {
    id: claims.user_id,
    email: claims.sub,
    full_name: savedUser.full_name || claims.full_name || claims.sub,
    role: claims.role,
  };
}

function setSession(user, token) {
  const claims = decodeToken(token);
  if (!claims || !VALID_ROLES.includes(claims.role) || claims.role !== user.role) {
    throw new Error('El servidor devolvió un token o rol de usuario no válido.');
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({
    id: user.id || claims.user_id,
    email: user.email || claims.sub,
    full_name: user.full_name || claims.full_name || user.email,
    role: claims.role,
  }));
  updateNavUserUI();
}

function logout() {
  clearSession();
  window.location.replace('index.html');
}

function showRbacAlert(title, message, isWarning = false) {
  let container = document.getElementById('rbac-alert-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'rbac-alert-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `rbac-toast ${isWarning ? 'warning' : ''}`;

  const icon = document.createElement('div');
  icon.className = 'rbac-toast-icon';
  icon.innerHTML = '<i data-lucide="shield-alert" aria-hidden="true"></i>';

  const content = document.createElement('div');
  content.className = 'rbac-toast-content';
  const heading = document.createElement('h4');
  heading.textContent = title;
  const description = document.createElement('p');
  description.textContent = message;
  content.append(heading, description);
  toast.append(icon, content);
  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

function checkPendingRbacFlash() {
  const flash = sessionStorage.getItem('rbac_redirect_reason');
  if (!flash) return;

  sessionStorage.removeItem('rbac_redirect_reason');
  try {
    const data = JSON.parse(flash);
    setTimeout(() => showRbacAlert(data.title, data.message, true), 400);
  } catch (error) {
    console.error('No se pudo mostrar el aviso de acceso restringido.', error);
  }
}

function setProtectedNavigation(user) {
  document.querySelectorAll('.nav-links a[href="merchant.html"], .nav-links a[href="admin.html"]')
    .forEach((link) => {
      const requiredRole = link.getAttribute('href') === 'admin.html' ? 'Administrador' : 'Comerciante';
      const allowed = requiredRole === 'Comerciante'
        ? user?.role === 'Comerciante' || user?.role === 'Administrador'
        : user?.role === 'Administrador';
      const item = link.closest('li');
      if (item) item.hidden = !allowed;
    });
}

function enforceViewPermissions(user = getCurrentUser()) {
  const currentPath = window.location.pathname.toLowerCase();
  let requiredRole = null;

  if (currentPath.endsWith('/admin.html')) requiredRole = 'Administrador';
  if (currentPath.endsWith('/merchant.html')) requiredRole = 'Comerciante';
  if (!requiredRole) return true;

  const allowed = requiredRole === 'Comerciante'
    ? user?.role === 'Comerciante' || user?.role === 'Administrador'
    : user?.role === 'Administrador';
  if (allowed) return true;

  const message = !user
    ? 'Inicia sesión con una cuenta autorizada para acceder a esta vista. Serás redirigido al inicio.'
    : `Tu cuenta con rol "${user.role}" no tiene permiso para acceder a esta vista.`;
  sessionStorage.setItem('rbac_redirect_reason', JSON.stringify({
    title: requiredRole === 'Administrador' ? 'Acceso restringido' : 'Acceso para comerciantes',
    message,
  }));

  const loginQuery = user ? '' : '?auth=login';
  window.location.replace(`index.html${loginQuery}`);
  return false;
}

async function readResponseJson(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new Error('El servidor devolvió una respuesta no válida.');
  }
}

function responseError(data, fallback) {
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => item.msg).filter(Boolean).join(' ');
  }
  return fallback;
}

async function refreshCurrentUser() {
  const token = getAuthToken();
  const cachedUser = getCurrentUser();
  if (!token || !cachedUser) return null;

  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    clearSession();
    return null;
  }
  if (!response.ok) {
    const data = await readResponseJson(response);
    throw new Error(responseError(data, 'No se pudo validar la sesión.'));
  }

  const user = await readResponseJson(response);
  if (!VALID_ROLES.includes(user.role) || !user.email || !user.full_name) {
    clearSession();
    throw new Error('El perfil recibido del servidor no es válido.');
  }

  const tokenClaims = decodeToken(token);
  if (!tokenClaims || tokenClaims.role !== user.role) {
    clearSession();
    return null;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

async function secureApiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 403) {
    const errData = await readResponseJson(response);
    const detail = responseError(errData, 'Operación denegada por permisos insuficientes.');
    showRbacAlert('Permisos insuficientes', detail, true);
    throw new Error(detail);
  }

  if (response.status === 401) {
    showRbacAlert('Sesión expirada', 'Por favor, inicia sesión nuevamente.', true);
    clearSession();
    window.location.replace('index.html?auth=login');
    throw new Error('No autenticado');
  }

  return response;
}

function updateNavUserUI(user = getCurrentUser()) {
  const userZone = document.querySelector('.user-zone');
  if (!userZone) return;

  let roleEl = document.getElementById('user-current-role');
  if (!roleEl) {
    roleEl = document.createElement('span');
    roleEl.id = 'user-current-role';
    roleEl.className = 'role-badge';
    userZone.prepend(roleEl);
  }

  let nameEl = document.getElementById('user-current-name');
  if (!nameEl) {
    nameEl = document.createElement('span');
    nameEl.id = 'user-current-name';
    nameEl.className = 'auth-user-name';
    roleEl.before(nameEl);
  }

  let loginButton = document.getElementById('btn-open-auth');
  if (!loginButton) {
    loginButton = document.createElement('button');
    loginButton.id = 'btn-open-auth';
    loginButton.type = 'button';
    loginButton.className = 'btn btn-primary';
    loginButton.innerHTML = '<i data-lucide="user-round" style="width: 16px; height: 16px;" aria-hidden="true"></i><span>Iniciar Sesión / Registrarse</span>';
    roleEl.before(loginButton);
  }

  let logoutButton = document.getElementById('btn-logout');
  if (!logoutButton) {
    logoutButton = document.createElement('button');
    logoutButton.id = 'btn-logout';
    logoutButton.type = 'button';
    logoutButton.className = 'btn btn-outline';
    logoutButton.innerHTML = '<i data-lucide="log-out" style="width: 16px; height: 16px;" aria-hidden="true"></i><span>Cerrar Sesión</span>';
    roleEl.after(logoutButton);
  }

  const signedIn = Boolean(user);
  nameEl.textContent = signedIn ? (user.full_name || user.email) : '';
  nameEl.hidden = !signedIn;
  roleEl.hidden = !signedIn;
  loginButton.hidden = signedIn;
  logoutButton.hidden = !signedIn;

  if (signedIn) {
    roleEl.textContent = user.role;
    roleEl.className = `role-badge ${
      user.role === 'Administrador' ? 'admin' : user.role === 'Comerciante' ? 'merchant' : 'tourist'
    }`;
  }

  loginButton.onclick = () => openAuthModal('login');
  logoutButton.onclick = logout;
  setProtectedNavigation(user);
  if (window.lucide) window.lucide.createIcons();
}

function createAuthModal() {
  let modal = document.getElementById('auth-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.className = 'auth-modal-backdrop';
  modal.hidden = true;
  modal.innerHTML = `
    <section class="auth-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div class="auth-modal-header">
        <div>
          <p class="auth-modal-eyebrow">Turismo Inteligente · Colombia</p>
          <h2 class="auth-modal-title" id="auth-modal-title">Bienvenido de vuelta</h2>
        </div>
        <button type="button" class="auth-modal-close" id="auth-modal-close" aria-label="Cerrar">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="auth-tabs" role="tablist" aria-label="Acceso a la cuenta">
        <button type="button" class="auth-tab" id="auth-tab-login" role="tab" aria-selected="true">Iniciar sesión</button>
        <button type="button" class="auth-tab" id="auth-tab-register" role="tab" aria-selected="false">Registrarse</button>
      </div>
      <form class="auth-form" id="auth-login-form">
        <div class="auth-field">
          <label for="login-email">Correo electrónico</label>
          <input id="login-email" name="email" type="email" autocomplete="email" required>
        </div>
        <div class="auth-field">
          <label for="login-password">Contraseña</label>
          <input id="login-password" name="password" type="password" autocomplete="current-password" required>
        </div>
        <p class="auth-status" id="login-status" role="alert" aria-live="polite"></p>
        <button type="submit" class="btn btn-primary auth-submit">Iniciar Sesión</button>
      </form>
      <form class="auth-form" id="auth-register-form" hidden>
        <div class="auth-field">
          <label for="register-name">Nombre completo</label>
          <input id="register-name" name="full_name" type="text" minlength="2" maxlength="100" autocomplete="name" required>
        </div>
        <div class="auth-field">
          <label for="register-email">Correo electrónico</label>
          <input id="register-email" name="email" type="email" autocomplete="email" required>
        </div>
        <div class="auth-field">
          <label for="register-password">Contraseña (mínimo 6 caracteres)</label>
          <input id="register-password" name="password" type="password" minlength="6" autocomplete="new-password" required>
        </div>
        <div class="auth-field">
          <label for="register-role">Tipo de cuenta</label>
          <select id="register-role" name="role">
            <option value="Turista">Turista</option>
            <option value="Comerciante">Comerciante</option>
          </select>
        </div>
        <p class="auth-status" id="register-status" role="alert" aria-live="polite"></p>
        <button type="submit" class="btn btn-primary auth-submit">Crear Cuenta</button>
      </form>
    </section>
  `;
  document.body.appendChild(modal);

  const loginTab = modal.querySelector('#auth-tab-login');
  const registerTab = modal.querySelector('#auth-tab-register');
  const loginForm = modal.querySelector('#auth-login-form');
  const registerForm = modal.querySelector('#auth-register-form');

  const selectTab = (tab) => {
    const isLogin = tab === 'login';
    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;
    loginTab.setAttribute('aria-selected', String(isLogin));
    registerTab.setAttribute('aria-selected', String(!isLogin));
    modal.querySelector('#auth-modal-title').textContent = isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta';
  };

  loginTab.addEventListener('click', () => selectTab('login'));
  registerTab.addEventListener('click', () => selectTab('register'));
  modal.querySelector('#auth-modal-close').addEventListener('click', closeAuthModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeAuthModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeAuthModal();
  });

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  if (window.lucide) window.lucide.createIcons();
  return modal;
}

function openAuthModal(tab = 'login') {
  const modal = createAuthModal();
  modal.hidden = false;
  const tabButton = modal.querySelector(tab === 'register' ? '#auth-tab-register' : '#auth-tab-login');
  tabButton.click();
  modal.querySelector(tab === 'register' ? '#register-name' : '#login-email').focus();
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.hidden = true;
}

async function postAuth(endpoint, payload) {
  const response = await fetch(`${API_BASE}/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await readResponseJson(response);
  if (!response.ok) {
    throw new Error(responseError(data, 'No se pudo completar la solicitud.'));
  }
  return data;
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.auth-status');
  const values = new FormData(form);
  submit.disabled = true;
  status.classList.remove('success');
  status.textContent = 'Validando tus credenciales...';

  try {
    const result = await postAuth('login', {
      email: values.get('email'),
      password: values.get('password'),
    });
    if (!result.access_token || !VALID_ROLES.includes(result.role)) {
      throw new Error('La respuesta de autenticación no contiene una sesión válida.');
    }
    setSession({
      id: result.user_id,
      email: values.get('email'),
      full_name: result.full_name,
      role: result.role,
    }, result.access_token);
    window.location.reload();
  } catch (error) {
    status.textContent = error.message || 'No se pudo iniciar sesión.';
  } finally {
    submit.disabled = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.auth-status');
  const values = new FormData(form);
  const email = values.get('email');
  const password = values.get('password');
  submit.disabled = true;
  status.classList.remove('success');
  status.textContent = 'Creando tu cuenta...';

  let accountCreated = false;
  try {
    await postAuth('register', {
      email,
      full_name: values.get('full_name'),
      password,
      role: values.get('role'),
    });
    accountCreated = true;
    const result = await postAuth('login', { email, password });
    if (!result.access_token || !VALID_ROLES.includes(result.role)) {
      throw new Error('La cuenta se creó, pero no se pudo iniciar la sesión automáticamente.');
    }
    setSession({
      id: result.user_id,
      email,
      full_name: result.full_name,
      role: result.role,
    }, result.access_token);
    window.location.reload();
  } catch (error) {
    status.textContent = accountCreated
      ? `La cuenta fue creada, pero no se pudo iniciar sesión automáticamente. ${error.message || ''}`
      : error.message || 'No se pudo crear la cuenta.';
  } finally {
    submit.disabled = false;
  }
}

async function initializeAuth() {
  createAuthModal();
  updateNavUserUI();
  checkPendingRbacFlash();

  let user = getCurrentUser();
  if (user) {
    try {
      user = await refreshCurrentUser();
    } catch (error) {
      console.error('No se pudo validar la sesión con el servidor.', error);
      showRbacAlert('No se pudo validar la sesión', error.message, true);
      if (window.location.pathname.toLowerCase().endsWith('/admin.html')
        || window.location.pathname.toLowerCase().endsWith('/merchant.html')) {
        user = null;
      }
    }
  }

  updateNavUserUI(user);
  if (!enforceViewPermissions(user)) return;
  document.body.classList.remove('auth-pending');

  const params = new URLSearchParams(window.location.search);
  if (params.get('auth') === 'login') {
    params.delete('auth');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    openAuthModal('login');
  }
}

document.addEventListener('DOMContentLoaded', initializeAuth);

window.TurismoApp = {
  getCurrentUser,
  getAuthToken,
  setSession,
  logout,
  showRbacAlert,
  secureApiFetch,
  enforceViewPermissions,
  updateNavUserUI,
  API_BASE,
};
