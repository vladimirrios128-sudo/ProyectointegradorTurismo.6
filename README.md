# Turismo Inteligente — Proyecto Integrador

Plataforma informática de turismo inteligente basada en una arquitectura modular, con mapa interactivo, recomendaciones de rutas, analítica y gestión por roles.

## Estructura

```text
.
├── app/
│   ├── api/v1/endpoints/       # Endpoints HTTP por dominio
│   ├── core/                   # Seguridad y dependencias
│   ├── db/                     # Sesión y modelos SQLAlchemy
│   ├── schemas/                # Contratos Pydantic
│   ├── services/               # Lógica de negocio (motor de rutas)
│   └── main.py                 # Composición de la API
├── frontend/
│   ├── index.html              # Estructura visual
│   ├── styles.css              # Sistema visual y responsive
│   ├── places.js               # Catálogo estático de destinos
│   └── app.js                  # Interacción y consumo de API
├── tests/
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Correspondencia con el documento del proyecto

- **RF-01:** motor de rutas y consulta de ruta desde la interfaz turística.
- **RF-02:** dashboard estadístico para comercio.
- **RF-03:** panel administrativo con métricas de plataforma.
- **RF-04:** autenticación mediante JWT/OAuth2 Password Flow en la API.
- **RF-05:** mapa interactivo, destinos y datos informativos.
- **Privacidad:** los datos de reseñas y favoritos están separados por usuario autenticado; la analítica de interfaz utiliza información agregada/demostrativa.
- **Arquitectura:** separación frontend/backend, endpoints por responsabilidad y lógica de rutas en un servicio independiente.

## Ejecución con Docker

```bash
docker compose up --build
```

- Frontend: `http://localhost`
- API: `http://localhost:5000`
- Documentación Swagger: `http://localhost:5000/docs`

Para producción, define una variable `SECRET_KEY` propia y restringe `allow_origins` en CORS.

## Ejecución local

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 5000
```

Luego abre `frontend/index.html` mediante un servidor estático.

## Nota sobre validación

El código Python y JavaScript fue validado sintácticamente en la reestructuración. La ejecución completa de las pruebas requiere instalar las dependencias de `requirements.txt`; el entorno de esta revisión no tiene acceso de red para descargarlas.
