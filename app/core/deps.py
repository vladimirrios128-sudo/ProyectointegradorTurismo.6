"""
Sistema de Dependencias y Control de Acceso Basado en Roles (RBAC) Estricto
Turismo Inteligente - Colombia
"""
from enum import Enum
import json
from typing import List, Optional
from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.security import SECRET_KEY, ALGORITHM
from app.core.audit import record_audit_event
from app.db.session import get_db
from app.db.models import User

# Esquema de autenticación Bearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
http_bearer = HTTPBearer(auto_error=False)


class UserRole(str, Enum):
    SUPER_ADMIN = "SuperAdmin"
    ADMIN = "Administrador"
    AUDITOR = "Auditor"
    MERCHANT = "Comerciante"
    TOURIST = "Turista"


# Jerarquía numérica de roles para evaluaciones de privilegios
ROLE_HIERARCHY = {
    UserRole.SUPER_ADMIN: 4,
    UserRole.ADMIN: 3,
    UserRole.AUDITOR: 2,
    UserRole.MERCHANT: 2,
    UserRole.TOURIST: 1,
}


def get_current_user(
    db: Session = Depends(get_db),
    auth_header: Optional[HTTPAuthorizationCredentials] = Security(http_bearer),
) -> User:
    """
    Extrae y valida el JWT token. Retorna la instancia de usuario autenticado.
    Lanza 401 si no hay credenciales o son inválidas.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales de acceso.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not auth_header:
        raise credentials_exception

    token = auth_header.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role_claim: str = payload.get("role")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo o no encontrado en el sistema.",
        )

    # Validar coherencia del rol
    if role_claim and user.role != role_claim:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inconsistencia de permisos detectada en la sesión.",
        )

    return user


def get_current_active_user_optional(
    db: Session = Depends(get_db),
    auth_header: Optional[HTTPAuthorizationCredentials] = Security(http_bearer),
) -> Optional[User]:
    """Permite el acceso a endpoints públicos pero identifica al usuario si está logueado."""
    if not auth_header:
        return None
    try:
        return get_current_user(db=db, auth_header=auth_header)
    except HTTPException:
        return None


class RoleChecker:
    """
    Verificador de permisos RBAC para dependencias de FastAPI (Depends/Security).
    Permite restringir endpoints a una lista específica de roles autorizados.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(
        self,
        request: Request,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in self.allowed_roles:
            path = request.url.path
            is_admin_endpoint = (
                path.startswith("/api/v1/admin/")
                or path.startswith("/api/v1/auth/users")
                or path == "/api/v1/system/source-code"
                or (path.startswith("/api/v1/places/") and path.endswith("/status"))
            )
            if current_user.role == UserRole.TOURIST.value and is_admin_endpoint:
                record_audit_event(
                    db,
                    request,
                    user_id=current_user.id,
                    email=current_user.email,
                    event="Intento de acceso administrativo",
                    status="Fallido",
                    is_suspicious=True,
                    alert_reason="Alerta de Intrusión",
                    details=f"{request.method} {path}",
                )
                db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: El rol '{current_user.role}' no cuenta con los privilegios requeridos para esta operación. Roles autorizados: {', '.join(self.allowed_roles)}.",
            )
        return current_user


class AuditorPermissionChecker:
    def __init__(self, allowed_roles: List[str], permission: str, module: str):
        self.allowed_roles = allowed_roles
        self.permission = permission
        self.module = module

    def __call__(
        self,
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role == UserRole.AUDITOR.value:
            try:
                permissions = json.loads(current_user.permisos or "{}")
            except (TypeError, json.JSONDecodeError) as error:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No hay permisos válidos asignados para este módulo.",
                ) from error
            if not isinstance(permissions, dict) or permissions.get(self.permission) is not True:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"El rol Auditor no tiene habilitado el acceso al módulo {self.module}.",
                )
            return current_user

        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No cuentas con permisos para consultar este módulo.",
            )
        return current_user


# Dependencias preconfiguradas reutilizables
require_admin = RoleChecker([UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value])
require_admin_or_auditor = AuditorPermissionChecker([
    UserRole.SUPER_ADMIN.value,
    UserRole.ADMIN.value,
], "ver_admin", "Administración")
require_super_admin = RoleChecker([UserRole.SUPER_ADMIN.value])
require_super_admin_or_auditor = AuditorPermissionChecker([
    UserRole.SUPER_ADMIN.value,
], "ver_rbac", "Archivos RBAC")
require_merchant = RoleChecker([UserRole.MERCHANT.value])
require_merchant_or_admin = RoleChecker([
    UserRole.SUPER_ADMIN.value,
    UserRole.ADMIN.value,
    UserRole.MERCHANT.value,
])
require_merchant_portal_read = AuditorPermissionChecker([
    UserRole.SUPER_ADMIN.value,
    UserRole.ADMIN.value,
    UserRole.MERCHANT.value,
], "ver_comerciante", "Portal Comerciante")
require_authenticated = RoleChecker([
    UserRole.SUPER_ADMIN.value,
    UserRole.ADMIN.value,
    UserRole.AUDITOR.value,
    UserRole.MERCHANT.value,
    UserRole.TOURIST.value,
])
