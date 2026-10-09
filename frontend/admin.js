document.addEventListener('DOMContentLoaded', () => {
    const userForm = document.getElementById('userForm');
    const responseMessage = document.getElementById('responseMessage');
    const btnSubmit = document.getElementById('btnSubmit');

    if (!userForm) return;

    userForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene que la pantalla se congele o recargue

        const emailInput = document.getElementById('userEmail') || document.getElementById('email');
        const passwordInput = document.getElementById('userPassword') || document.getElementById('password');
        const roleSelect = document.getElementById('userRole') || document.getElementById('role');

        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        const role = roleSelect ? roleSelect.value : 'tourist';
        const token = localStorage.getItem('token');

        if (!email || !password) {
            showMessage('❌ Por favor completa el correo y la contraseña', 'bg-rose-900/50 text-rose-400 border border-rose-700');
            return;
        }

        // Estado visual de carga
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerText = "Registrando...";
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    role: role
                })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage(`✅ Usuario ${role} (${email}) creado exitosamente`, 'bg-emerald-900/50 text-emerald-400 border border-emerald-700');
                userForm.reset();
            } else {
                let detailMsg = 'No se pudo crear el usuario';
                if (typeof data.detail === 'string') {
                    detailMsg = data.detail;
                } else if (Array.isArray(data.detail)) {
                    detailMsg = data.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(' | ');
                }
                showMessage(`❌ ${detailMsg}`, 'bg-rose-900/50 text-rose-400 border border-rose-700');
            }
        } catch (error) {
            console.error('Error al intentar registrar:', error);
            showMessage('❌ Error de conexión con el servidor FastAPI (127.0.0.1:8000)', 'bg-rose-900/50 text-rose-400 border border-rose-700');
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerText = "Crear Usuario";
            }
        }
    });

    function showMessage(msg, classes) {
        if (!responseMessage) {
            alert(msg);
            return;
        }
        responseMessage.className = `text-sm p-3 rounded-lg text-center font-medium ${classes}`;
        responseMessage.innerText = msg;
        responseMessage.classList.remove('hidden');
    }
});