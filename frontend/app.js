// Variable para almacenar el rol activo (user, admin, guest)
let currentRole = 'user';

// Función para cambiar de pestaña en el login
function switchAuthTab(tab) {
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const tabAdmin = document.getElementById('tab-admin');
    const btnSubmit = document.getElementById('btn-login-submit');

    // Resetear estilos de pestañas
    [tabLogin, tabRegister, tabAdmin].forEach(t => {
        t.className = "flex-1 pb-3 border-b-2 border-transparent text-slate-400 hover:text-white";
    });

    if (tab === 'login') {
        currentRole = 'user';
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
        tabLogin.className = "flex-1 pb-3 border-b-2 border-amber-500 text-amber-500 font-semibold";
        btnSubmit.innerText = "Ingresar como Usuario →";
    } else if (tab === 'register') {
        formLogin.classList.add('hidden');
        formRegister.classList.remove('hidden');
        tabRegister.className = "flex-1 pb-3 border-b-2 border-amber-500 text-amber-500 font-semibold";
    } else if (tab === 'admin') {
        currentRole = 'admin';
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
        tabAdmin.className = "flex-1 pb-3 border-b-2 border-amber-500 text-amber-500 font-semibold";
        btnSubmit.innerText = "Ingresar como Administrador →";
    }
}

// Función para Ingresar como Invitado
function loginAsGuest() {
    currentRole = 'guest';
    document.getElementById('auth-modal').classList.add('hidden');
    console.log("Acceso concedido como Invitado");
}

// Manejador del Registro
function handleRegister(event) {
    event.preventDefault();
    alert("Usuario creado exitosamente. Ahora puedes iniciar sesión.");
    switchAuthTab('login');
}