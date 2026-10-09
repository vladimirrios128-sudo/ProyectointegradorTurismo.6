import random
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])

# Almacén temporal en memoria para los códigos OTP
otp_store = {}

# Parámetros del servidor SMTP de correo electrónico
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "tu_correo@gmail.com"
SENDER_PASSWORD = "tu_app_password"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Verify2FARequest(BaseModel):
    email: EmailStr
    otp_code: str

def send_otp_email(destination_email: str, otp_code: str):
    """Envía el código de verificación OTP mediante SMTP."""
    subject = "🔑 Código de Verificación (2FA) - Turismo Inteligente"
    body = f"""
    Hola,

    Tu código de verificación en dos pasos para ingresar a Turismo Inteligente es:

    👉 {otp_code} 👈

    Este código es válido por 5 minutos. Si no solicitaste este código, ignora este correo.

    Saludos,
    Equipo de Turismo Inteligente Colombia.
    """
    
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = destination_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"[SMTP log] Error enviando correo electrónico: {e}")

@router.post("/login")
def login_step_one(credentials: LoginRequest):
    if len(credentials.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )

    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = time.time() + 300  # Válido por 5 minutos

    otp_store[credentials.email] = {
        "otp": otp_code,
        "expires_at": expires_at
    }

    send_otp_email(credentials.email, otp_code)

    return {
        "status": "2fa_required",
        "message": "Código de verificación enviado al correo.",
        "email": credentials.email
    }

@router.post("/verify-2fa")
def verify_two_factor(data: Verify2FARequest):
    record = otp_store.get(data.email)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se ha solicitado un código para este correo."
        )

    if time.time() > record["expires_at"]:
        del otp_store[data.email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación ha expirado."
        )

    if record["otp"] != data.otp_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de verificación incorrecto."
        )

    del otp_store[data.email]

    return {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "bearer",
        "role": "merchant",
        "email": data.email
    }