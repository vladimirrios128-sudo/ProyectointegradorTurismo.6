"""
Sesión de Base de Datos y Engine SQLAlchemy
Turismo Inteligente - Colombia
"""
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

# Base de datos SQLite local para pruebas rápidas o PostgreSQL configurable
SQLALCHEMY_DATABASE_URL = "sqlite:///./turismo_colombia.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_user_permissions_column(database_engine=engine) -> None:
    if "permisos" not in {
        column["name"] for column in inspect(database_engine).get_columns("users")
    }:
        with database_engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN permisos TEXT")


def get_db():
    """Generador de sesión de base de datos para inyección de dependencias FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
