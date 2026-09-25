// Variable global para almacenar el rol activo
let currentRole = 'user';

// Función para alternar entre las pestañas (Iniciar Sesión, Crear Usuario, Administrador)
window.switchAuthTab = function(tab) {
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const tabAdmin = document.getElementById('tab-admin');
    const btnSubmit = document.getElementById('btn-login-submit');

    // Restablecer estilos de pestañas
    [tabLogin, tabRegister, tabAdmin].forEach(t => {
        if (t) {
            t.className = "flex-1 pb-3 border-b-2 border-transparent text-slate-400 hover:text-white transition-all cursor-pointer";
        }
    });

    if (tab === 'login') {
        currentRole = 'user';
        if (formLogin) formLogin.classList.remove('hidden');
        if (formRegister) formRegister.classList.add('hidden');
        if (tabLogin) tabLogin.className = "flex-1 pb-3 border-b-2 border-amber-500 text-amber-500 font-semibold transition-all cursor-pointer";
        if (btnSubmit) btnSubmit.innerText = "Ingresar a la Plataforma →";
    } else if (tab === 'register') {
        if (formLogin) formLogin.classList.add('hidden');
        if (formRegister) formRegister.classList.remove('hidden');
        if (tabRegister) tabRegister.className = "flex-1 pb-3 border-b-2 border-amber-500 text-amber-500 font-semibold transition-all cursor-pointer";
    } else if (tab === 'admin') {
        currentRole = 'admin';
        if (formLogin) formLogin.classList.remove('hidden');
        if (formRegister) formRegister.classList.add('hidden');
        if (tabAdmin) tabAdmin.className = "flex-1 pb-3 border-b-2 border-amber-500 text-amber-500 font-semibold transition-all cursor-pointer";
        if (btnSubmit) btnSubmit.innerText = "Ingresar como Administrador →";
    }
};

// Función para procesar el inicio de sesión
window.handleLogin = function(event) {
    event.preventDefault();
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;

    console.log(`Inicio de sesión [${currentRole.toUpperCase()}]:`, email);
    
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
    
    alert(`¡Bienvenido! Has ingresado correctamente como ${currentRole === 'admin' ? 'Administrador' : 'Usuario'}.`);
};

// Función para procesar la creación de cuenta
window.handleRegister = function(event) {
    event.preventDefault();
    const name = document.getElementById('reg-name')?.value;
    const email = document.getElementById('reg-email')?.value;

    console.log("Creando nuevo usuario:", name, email);
    
    alert(`¡Cuenta creada con éxito para ${name}! Ahora puedes iniciar sesión.`);
    
    const formReg = document.getElementById('form-register');
    if (formReg) formReg.reset();
    
    window.switchAuthTab('login');
};

// Función para el ingreso de invitados
window.loginAsGuest = function() {
    currentRole = 'guest';
    console.log("Acceso como invitado concedido");
    
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
    
    alert("Has ingresado como Invitado (Modo lectura).");
};

// Inicialización segura del DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema de autenticación listo.");
});