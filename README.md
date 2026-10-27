<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/47b14ae5-52ec-4f61-b12d-4b3bc7ed012e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Desarrollo local con autenticación

La interfaz React se sirve en `http://localhost:3000` y envía las solicitudes de autenticación a `http://localhost:8000/api/v1`. Debes ejecutar el frontend y FastAPI en terminales separadas:

1. En una terminal, instala las dependencias de Python si aún no lo has hecho y arranca la API:
   ```powershell
   pip install -r requirements.txt
   $env:ENABLE_MASTER_ADMIN_REGISTRATION = "true"
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
2. En otra terminal, arranca la interfaz:
   ```powershell
   npm run dev
   ```

FastAPI permite solicitudes CORS desde `localhost:3000` y `127.0.0.1:3000`. Con `ENABLE_MASTER_ADMIN_REGISTRATION=true` (activado arriba solo para la terminal local), registra una cuenta nueva con el correo exacto `admin@turismocolombia.com`; ese correo recibe automáticamente el rol Administrador, sin importar el rol elegido en el formulario. Los demás registros conservan el rol Turista o Comerciante seleccionado.

> La asignación de privilegios basada únicamente en una dirección de correo no verifica que la persona controle ese buzón. Esta regla es para pruebas locales y debe protegerse o deshabilitarse antes de exponer la API en producción.

En el arranque, la API crea si no existe la cuenta SuperAdmin local `superadmin@turismocolombia.co` con contraseña inicial `SuperAdmin1234!`. Cámbiala antes de usar datos o entornos compartidos. SuperAdmin hereda los permisos de Administrador. El rol Auditor, asignado por SuperAdmin desde la gestión de usuarios, recibe permisos granulares de solo lectura para Administración, Archivos RBAC y Portal Comerciante. Los permisos se guardan como JSON en `users.permisos`; los tres accesos están desactivados si no se especifican. Las operaciones de escritura continúan restringidas y responden HTTP 403 a Auditor.

### Monitoreo y auditoría de seguridad

Al iniciar FastAPI se crea la tabla `audit_logs` si todavía no existe, y se añade `users.permisos` a las bases existentes. La API registra accesos correctos y fallidos, cambios de rol, lecturas de módulos por Auditores (`AUDITOR_READ`) y denegaciones administrativas para usuarios Turista. Cuatro o más intentos fallidos del mismo correo en una ventana de cinco minutos activan una alerta de fuerza bruta; los inicios de sesión exitosos entre la 1:00 y las 4:00 a. m. (hora de Colombia) y los intentos de acceso administrativo denegados también se marcan como sospechosos. La vista de SuperAdmin y los Auditores autorizados consultan `GET /api/v1/admin/security-logs`; la pestaña SuperAdmin `Auditoría de Lectura` consulta `GET /api/v1/admin/auditor-read-logs`. Los registros incluyen la IP de conexión y deben tratarse como datos sensibles.

### Publicación y moderación de atractivos

El formulario del Portal Comerciante permite subir imágenes JPEG, PNG o WebP de hasta 5 MB; la API las guarda en `app/uploads/places` y las sirve bajo `/uploads`. Si no se adjunta una imagen, el backend asigna una imagen turística de Unsplash. Todos los lugares nuevos quedan con `is_verified=false`; el muro y el catálogo público consultan únicamente lugares verificados. La aprobación y revocación se guarda en `PATCH /api/v1/places/{place_id}/status`.
