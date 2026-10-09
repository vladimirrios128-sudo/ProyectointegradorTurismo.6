let currentLoginEmail = '';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const modal2FA = document.getElementById('modal2FA');
    const btnVerify2FA = document.getElementById('btnVerify2FA');
    const btnCancel2FA = document.getElementById('btnCancel2FA');
    const otpInput = document.getElementById('otpInput');
    const otpError = document.getElementById('otpError');

    // Paso 1: Envío del login inicial
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('emailInput').value.trim();
            const password = document.getElementById('passwordInput').value.trim();

            try {
                const response = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.status === '2fa_required') {
                    currentLoginEmail = email;
                    otpInput.value = '';
                    otpError.classList.add('hidden');
                    modal2FA.classList.remove('hidden');
                    otpInput.focus();
                } else {
                    alert(data.detail || "Error en las credenciales.");
                }
            } catch (err) {
                console.error("Error al autenticar:", err);
                alert("Ocurrió un error al conectar con el servidor.");
            }
        });
    }

    // Paso 2: Validación del código OTP de 6 dígitos
    if (btnVerify2FA) {
        btnVerify2FA.addEventListener('click', async () => {
            const otpCode = otpInput.value.trim();

            if (otpCode.length !== 6) {
                otpError.innerText = "Ingresa los 6 dígitos del código.";
                otpError.classList.remove('hidden');
                return;
            }

            try {
                const response = await fetch('/api/v1/auth/verify-2fa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: currentLoginEmail, otp_code: otpCode })
                });

                const data = await response.json();

                if (response.ok) {
                    // Guardar tokens y sesión localmente[cite: 10.2]
                    localStorage.setItem('userToken', data.access_token);
                    localStorage.setItem('userRole', data.role);
                    localStorage.setItem('userEmail', data.email);

                    // Redirigir al panel del mapa principal
                    window.location.href = 'places.html';
                } else {
                    otpError.innerText = data.detail || "Código incorrecto o expirado.";
                    otpError.classList.remove('hidden');
                }
            } catch (err) {
                console.error("Error validando 2FA:", err);
                otpError.innerText = "Error de conexión con el servidor.";
                otpError.classList.remove('hidden');
            }
        });
    }

    // Cancelar modal
    if (btnCancel2FA) {
        btnCancel2FA.addEventListener('click', () => {
            modal2FA.classList.add('hidden');
            otpInput.value = '';
            otpError.classList.add('hidden');
        });
    }
});