const API_HOST =
    window.location.hostname || "localhost";

const API_PROTOCOL =
    window.location.protocol === "file:"
        ? "http:"
        : window.location.protocol;

const API_URL =
    `${API_PROTOCOL}//${API_HOST}:5000`;


const token =
    localStorage.getItem("jwt_token");


const storedRole =
    localStorage.getItem("user_role");


const userName =
    localStorage.getItem("user_name");


/*
 * Si no existe token,
 * no se puede entrar.
 */

if (!token) {

    window.location.href = "index.html";

}


/*
 * IMPORTANTE:
 * El rol almacenado NO es suficiente
 * para seguridad real.
 *
 * Lo verificamos nuevamente
 * contra el backend.
 */

async function verifyAdminAccess() {

    try {

        const response = await fetch(
            `${API_URL}/api/v1/auth/me`,
            {
                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        if (!response.ok) {

            throw new Error(
                "Sesión no válida"
            );

        }


        const user =
            await response.json();


        /*
         * AUTORIZACIÓN REAL
         */

        if (
            user.rol !== "admin_global" &&
            user.rol !== "admin_comercio"
        ) {

            window.location.href =
                "index.html";

            return;
        }


        /*
         * Mostrar información
         */

        const roleElement =
            document.getElementById(
                "admin-role"
            );

        const userElement =
            document.getElementById(
                "admin-user"
            );

        const messageElement =
            document.getElementById(
                "admin-message"
            );


        if (
            user.rol === "admin_global"
        ) {

            roleElement.textContent =
                "Administrador Global";

            messageElement.textContent =
                "Tienes acceso a las funciones globales de administración.";

        }


        if (
            user.rol === "admin_comercio"
        ) {

            roleElement.textContent =
                "Administrador de Comercio";

            messageElement.textContent =
                "Tienes acceso a las funciones administrativas de comercio.";

        }


        userElement.textContent =
            user.full_name ||
            userName ||
            user.email;


    } catch (error) {

        console.error(error);

        localStorage.removeItem(
            "jwt_token"
        );

        localStorage.removeItem(
            "user_role"
        );

        localStorage.removeItem(
            "user_name"
        );

        window.location.href =
            "index.html";

    }

}


/*
 * Cerrar sesión
 */

document
    .getElementById("btn-logout")
    .addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "jwt_token"
            );

            localStorage.removeItem(
                "user_role"
            );

            localStorage.removeItem(
                "user_name"
            );

            window.location.href =
                "index.html";

        }
    );


verifyAdminAccess();