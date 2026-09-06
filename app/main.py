from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints.routes import router as routes_router
from app.api.v1.endpoints.auth import router as auth_router

app = FastAPI(
    title="Turismo Inteligente API",
    version="1.0.0",
    description="Backend para el calculo de rutas y gestion del sistema"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_router, prefix="/api/v1/routes", tags=["Motor de Rutas"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Autenticacion y Usuarios"])

@app.get("/", tags=["Health Check"])
def root():
    return {"status": "ok", "message": "API de Turismo Inteligente activa"}
