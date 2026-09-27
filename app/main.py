from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.favorites import router as favorites_router
from app.api.v1.endpoints.places import router as places_router
from app.api.v1.endpoints.reviews import router as reviews_router
from app.api.v1.endpoints.routes import router as routes_router
from app.db.session import Base, engine

# Create the schema once at startup. For production, replace this with migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Turismo Inteligente API",
    version="1.1.0",
    description="API modular para turismo inteligente, rutas y gestión de destinos.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to the frontend origin in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=f"{API_PREFIX}/auth", tags=["Autenticación"])
app.include_router(places_router, prefix=f"{API_PREFIX}/places", tags=["Destinos"])
app.include_router(routes_router, prefix=f"{API_PREFIX}/routes", tags=["Motor de rutas"])
app.include_router(reviews_router, prefix=f"{API_PREFIX}/reviews", tags=["Reseñas"])
app.include_router(favorites_router, prefix=f"{API_PREFIX}/favorites", tags=["Favoritos"])


@app.get("/", tags=["Health Check"])
def root():
    return {"status": "ok", "message": "API de Turismo Inteligente activa"}
