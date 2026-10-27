"""Idempotent seed data for privileged local development accounts."""
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.models import User

SUPER_ADMIN_EMAIL = "superadmin@turismocolombia.co"
SUPER_ADMIN_PASSWORD = "SuperAdmin1234!"
SUPER_ADMIN_FULL_NAME = "Super Administrador Maestro"


def ensure_super_admin(db: Session) -> None:
    existing_user = db.query(User).filter(User.email == SUPER_ADMIN_EMAIL).first()
    if existing_user is not None:
        return

    db.add(User(
        email=SUPER_ADMIN_EMAIL,
        hashed_password=get_password_hash(SUPER_ADMIN_PASSWORD),
        full_name=SUPER_ADMIN_FULL_NAME,
        role="SuperAdmin",
        is_active=True,
    ))
    db.commit()
