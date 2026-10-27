"""
Endpoints de Autenticación, Sesión y Gestión de Usuarios con RBAC
Turismo Inteligente - Colombia
"""
import json
import os
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.audit import record_audit_event, record_auditor_read
from app.core.deps import (
    get_current_user,
    require_admin,
    require_admin_or_auditor,
    require_super_admin,
    UserRole,
)
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.models import AuditLog, User
from app.db.session import get_db
from app.schemas.auth import (
    AdminUserCreate,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdateRole,
)

router = APIRouter()

MASTER_ADMIN_EMAIL = "admin@turismocolombia.com"
MASTER_ADMIN_REGISTRATION_ENABLED = (
    os.getenv("ENABLE_MASTER_ADMIN_REGISTRATION", "false").strip().lower() == "true"
)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registro público de usuarios.
    Por defecto se asigna el rol 'Turista'.
    Si un usuario desea registrarse como Comerciante, puede solicitarlo en el formulario.
    El correo maestro recibe el rol 'Administrador' automáticamente cuando la regla
    está habilitada explícitamente para pruebas locales.
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta registrada con este correo electrónico.",
        )

    if MASTER_ADMIN_REGISTRATION_ENABLED and user_in.email == MASTER_ADMIN_EMAIL:
        assigned_role = UserRole.ADMIN.value
    else:
        assigned_role = user_in.role.value if user_in.role else UserRole.TOURIST.value
        if assigned_role in (
            UserRole.ADMIN.value,
            UserRole.SUPER_ADMIN.value,
            UserRole.AUDITOR.value,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No está permitido auto-asignar roles privilegiados durante el registro.",
            )

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=assigned_role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Autenticación de usuarios por email y contraseña.
    Genera un token JWT con la información de rol para RBAC.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        now = datetime.utcnow()
        recent_failures = (
            db.query(AuditLog)
            .filter(
                func.lower(AuditLog.email) == login_data.email.lower(),
                AuditLog.event == "Intento Fallido",
                AuditLog.status == "Fallido",
                AuditLog.timestamp >= now - timedelta(minutes=5),
            )
            .all()
        )
        is_brute_force = len(recent_failures) >= 3
        alert_reason = "Alerta de Fuerza Bruta" if is_brute_force else None
        if is_brute_force:
            for failed_attempt in recent_failures:
                failed_attempt.is_suspicious = True
                failed_attempt.alert_reason = alert_reason

        record_audit_event(
            db,
            request,
            user_id=user.id if user else None,
            email=login_data.email,
            event="Intento Fallido",
            status="Fallido",
            is_suspicious=is_brute_force,
            alert_reason=alert_reason,
            details="Credenciales incorrectas.",
            timestamp=now,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas. Verifique su email y contraseña.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        record_audit_event(
            db,
            request,
            user_id=user.id,
            email=user.email,
            event="Intento Fallido",
            status="Fallido",
            details="La cuenta está inactiva.",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cuenta se encuentra inactiva. Contacte al administrador.",
        )

    login_time = datetime.utcnow()
    colombia_hour = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=-5))).hour
    unusual_hour = 1 <= colombia_hour < 4
    record_audit_event(
        db,
        request,
        user_id=user.id,
        email=user.email,
        event="Inicio de Sesión",
        status="Exitoso",
        is_suspicious=unusual_hour,
        alert_reason="Inicio de sesión en horario inusual (01:00–04:00, hora de Colombia)." if unusual_hour else None,
        timestamp=login_time,
    )
    db.commit()

    access_token = create_access_token(
        subject=user.email,
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
    }


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Obtiene el perfil y rol del usuario actualmente autenticado."""
    return current_user


# =========================================================================
# ENDPOINTS PROTEGIDOS EXCLUSIVOS PARA ADMINISTRADOR
# =========================================================================

@router.get(
    "/users",
    response_model=List[UserResponse],
)
def list_all_users(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_auditor),
):
    """Lista usuarios a Administradores y a Auditores autorizados."""
    users = db.query(User).all()
    if current_user.role == UserRole.AUDITOR.value:
        record_auditor_read(db, request, current_user, "Administración")
    return users


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_admin_user(
    user_in: AdminUserCreate,
    request: Request,
    db: Session = Depends(get_db),
    super_admin: User = Depends(require_super_admin),
):
    """Crea un usuario con rol asignado. Exclusivo para SuperAdmin."""
    existing_user = (
        db.query(User)
        .filter(func.lower(User.email) == user_in.email.lower())
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta registrada con este correo electrónico.",
        )

    if user_in.role == UserRole.AUDITOR and user_in.permisos is not None:
        permisos = json.dumps(user_in.permisos.model_dump())
    elif user_in.role == UserRole.AUDITOR:
        permisos = json.dumps({
            "ver_rbac": False,
            "ver_admin": False,
            "ver_comerciante": False,
        })
    else:
        if user_in.permisos is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Los permisos granulares solo pueden asignarse al rol Auditor.",
            )
        permisos = None

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role.value,
        permisos=permisos,
        is_active=True,
    )
    db.add(user)
    record_audit_event(
        db,
        request,
        user_id=super_admin.id,
        email=super_admin.email,
        event="Creación de Usuario",
        status="Exitoso",
        details=f"SuperAdmin creó al usuario {user.email} con rol {user.role}.",
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if (
            db.query(User)
            .filter(func.lower(User.email) == user_in.email.lower())
            .first()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una cuenta registrada con este correo electrónico.",
            )
        raise

    db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=UserResponse, dependencies=[Depends(require_admin)])
def update_user_role(
    user_id: int,
    role_update: UserUpdateRole,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Permite al Administrador ascender o modificar el rol de un usuario."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado.",
        )

    if (
        role_update.role.value == UserRole.SUPER_ADMIN.value
        and admin_user.role != UserRole.SUPER_ADMIN.value
    ) or (
        user.role == UserRole.SUPER_ADMIN.value
        and admin_user.role != UserRole.SUPER_ADMIN.value
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un SuperAdmin puede asignar el rol SuperAdmin.",
        )

    previous_role = user.role
    user.role = role_update.role.value
    record_audit_event(
        db,
        request,
        user_id=admin_user.id,
        email=admin_user.email,
        event="Cambio de Rol",
        status="Exitoso",
        details=f"Usuario {user.email}: {previous_role} → {user.role}",
    )
    db.commit()
    db.refresh(user)
    return user
