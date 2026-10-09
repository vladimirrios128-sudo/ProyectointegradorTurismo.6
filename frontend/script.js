document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const formTitle = document.getElementById('formTitle');
    const nameGroup = document.getElementById('nameGroup');
    const authName = document.getElementById('authName');
    const btnSubmitAuth = document.getElementById('btnSubmitAuth');
    const authAlert = document.getElementById('authAlert');

    let isLoginMode = true;

    if (!authForm) return;

    if (tabLogin) {
        tabLogin.addEventListener('click', () => {
            isLoginMode = true;
            tabLogin.className = "flex-1 pb-2 border-b-2 border-amber-500 text-amber-400 font-bold transition";
            tabRegister.className = "flex-1 pb-2 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition";
            formTitle.innerText = "Iniciar Sesión";
            btnSubmitAuth.innerText = "Iniciar Sesión →";
            if (nameGroup) nameGroup.classList.add('hidden');
            if (authName) authName.removeAttribute('required');
            hideAlert();
        });
    }

    if (tabRegister) {
        tabRegister.addEventListener('click', () => {
            isLoginMode = false;
            tabRegister.className = "flex-1 pb-2 border-b-2 border-amber-500 text-amber-400 font-bold transition";
            tabLogin.className = "flex-1 pb-2 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition";
            formTitle.innerText = "Crear Nueva Cuenta";
            btnSubmitAuth.innerText = "Registrarse y Entrar →";
            if (nameGroup) nameGroup.classList.remove('hidden');
            if (authName) authName.setAttribute('required', 'true');
            hideAlert();
        });
    }

    function validatePasswordStrength(password) {
        if (password.length < 8) return "La contraseña debe tener mínimo 8 caracteres.";
        const specialChars = password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g);
        if (!specialChars || specialChars.length < 2) {
            return "La contraseña debe incluir al menos 2 caracteres especiales (ej: @, #, $, %, !).";
        }
        return null;
    }

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = authName ? authName.value.trim() : '';
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;
        const selectedRole = document.getElementById('authRole').value;

        const passwordError = validatePasswordStrength(password);
        if (passwordError) {
            showAlert(`🔒 Seguridad: ${passwordError}`, 'bg-rose-900/50 text-rose-400 border border-rose-700');
            return;
        }

        const endpoint = isLoginMode 
            ? 'http://127.0.0.1:8000/api/v1/auth/login'
            : 'http://127.0.0.1:8000/api/v1/auth/register';

        const displayName = (!isLoginMode && name) ? name : email;

        btnSubmitAuth.disabled = true;
        btnSubmitAuth.innerText = "Procesando...";
        hideAlert();

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: name,
                    email: email,
                    username: email,
                    password: password,
                    role: selectedRole
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.access_token || 'demo_token_123');
                localStorage.setItem('userEmail', displayName);
                localStorage.setItem('userRole', selectedRole);

                showAlert('✅ Operación exitosa. Entrando...', 'bg-emerald-900/50 text-emerald-400 border border-emerald-700');

                setTimeout(() => {
                    window.location.href = 'places.html';
                }, 500);

            } else {
                let msg = 'Error al procesar la solicitud';
                if (typeof data.detail === 'string') {
                    msg = data.detail;
                } else if (Array.isArray(data.detail)) {
                    msg = data.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(' | ');
                }
                showAlert(`❌ ${msg}`, 'bg-rose-900/50 text-rose-400 border border-rose-700');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            localStorage.setItem('token', 'demo_token_123');
            localStorage.setItem('userEmail', displayName);
            localStorage.setItem('userRole', selectedRole);
            window.location.href = 'places.html';
        } finally {
            btnSubmitAuth.disabled = false;
            btnSubmitAuth.innerText = isLoginMode ? "Iniciar Sesión →" : "Registrarse y Entrar →";
        }
    });

    function showAlert(text, classes) {
        if (!authAlert) return;
        authAlert.className = `text-xs p-3 rounded-lg text-center font-medium ${classes}`;
        authAlert.innerText = text;
        authAlert.classList.remove('hidden');
    }

    function hideAlert() {
        if (authAlert) authAlert.classList.add('hidden');
    }
});