from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.audit import record_auditor_read
from app.core.deps import require_admin_or_auditor, require_super_admin
from app.db.models import AuditLog, User
from app.db.session import get_db

router = APIRouter()


@router.get("/security-logs")
def read_security_logs(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_auditor),
):
    """Return recent audit activity and security metrics to SuperAdmin or Auditor."""
    now_utc = datetime.now(timezone.utc)
    now_utc_naive = now_utc.replace(tzinfo=None)
    colombia_timezone = timezone(timedelta(hours=-5))
    colombia_now = now_utc.astimezone(colombia_timezone)
    local_day_start = datetime.combine(
        colombia_now.date(),
        time.min,
        tzinfo=colombia_timezone,
    )
    today_start_utc = local_day_start.astimezone(timezone.utc).replace(tzinfo=None)
    alerts_since = now_utc_naive - timedelta(hours=24)

    login_count_today = (
        db.query(AuditLog)
        .filter(
            AuditLog.event == "Inicio de Sesión",
            AuditLog.status == "Exitoso",
            AuditLog.timestamp >= today_start_utc,
        )
        .count()
    )
    active_alerts = (
        db.query(AuditLog)
        .filter(AuditLog.is_suspicious.is_(True), AuditLog.timestamp >= alerts_since)
        .count()
    )
    recent_logs = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
        .limit(250)
        .all()
    )

    response = {
        "total_users": db.query(User).count(),
        "logins_today": login_count_today,
        "active_alerts": active_alerts,
        "logs": [
            {
                "id": entry.id,
                "user_id": entry.user_id,
                "email": entry.email,
                "event": entry.event,
                "timestamp": entry.timestamp.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
                "ip_address": entry.ip_address,
                "status": entry.status,
                "is_suspicious": entry.is_suspicious,
                "alert_reason": entry.alert_reason,
                "details": entry.details,
            }
            for entry in recent_logs
        ],
    }
    if current_user.role == "Auditor":
        record_auditor_read(db, request, current_user, "Administración")
    return response


@router.get("/auditor-read-logs", dependencies=[Depends(require_super_admin)])
def read_auditor_read_logs(db: Session = Depends(get_db)):
    """Return successful read events performed by authorized Auditor accounts."""
    entries = (
        db.query(AuditLog, User.full_name)
        .outerjoin(User, AuditLog.user_id == User.id)
        .filter(
            AuditLog.event == "AUDITOR_READ",
            AuditLog.status == "Exitoso",
        )
        .order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
        .limit(500)
        .all()
    )
    return [
        {
            "id": entry.id,
            "timestamp": entry.timestamp.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            "auditor_name": full_name or entry.email,
            "email": entry.email,
            "module": (
                entry.details.partition("module=")[2].partition(";")[0]
                if entry.details and "module=" in entry.details
                else "Desconocido"
            ),
        }
        for entry, full_name in entries
    ]
