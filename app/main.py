from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import auth

app = FastAPI(
    title="Turismo Inteligente API",
    description="API con RBAC y Autenticación Segura",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusión del router apuntando a /api/v1/auth
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])

@app.get("/")
def root():
    return {"message": "API de Turismo Inteligente activa"}