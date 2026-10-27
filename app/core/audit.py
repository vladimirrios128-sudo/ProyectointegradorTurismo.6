from datetime import datetime
from typing import Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.db.models import AuditLog, User


def record_audit_event(
    db: Session,
    request: Request,
    *,
    user_id: Optional[int],
    email: str,
    event: str,
    status: str,
    is_suspicious: bool = False,
    alert_reason: Optional[str] = None,
    details: Optional[str] = None,
    timestamp: Optional[datetime] = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        email=email,
        event=event,
        timestamp=timestamp or datetime.utcnow(),
        ip_address=request.client.host if request.client else None,
        status=status,
        is_suspicious=is_suspicious,
        alert_reason=alert_reason,
        details=details,
    )
    db.add(entry)
    return entry


def record_auditor_read(db: Session, request: Request, user: User, module: str) -> None:
    record_audit_event(
        db,
        request,
        user_id=user.id,
        email=user.email,
        event="AUDITOR_READ",
        status="Exitoso",
        details=f"module={module}; Auditor {user.email} consultó el módulo {module}.",
    )
    db.commit()
