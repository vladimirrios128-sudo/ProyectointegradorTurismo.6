from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext

# Crea un encriptador rápido justo ahí arriba
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.db.models import UserModel
from app.db.session import get_db
from app.schemas.auth import Token, UserCreate, UserResponse


router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):

    # Buscar si el correo ya existe
    existing_user = (
        db.query(UserModel)
        .filter(UserModel.email == user_in.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado.",
        )


    # Todos los usuarios registrados desde el formulario
    # público nacen como turistas.
    user = UserModel(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        rol="turista",
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post(
    "/login",
    response_model=Token,
)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):

    # Buscar usuario por correo
    user = (
        db.query(UserModel)
        .filter(UserModel.email == form_data.username)
        .first()
    )


    # Validar usuario y contraseña
    if (
        user is None
        or not user.is_active
        or not verify_password(
            form_data.password,
            user.hashed_password,
        )
    ):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )


    # Crear JWT
    access_token = create_access_token(
        data={
            "sub": user.email,
            "rol": user.rol,
            "name": user.full_name,
        }
    )


    # Respuesta
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "rol": user.rol,
        "full_name": user.full_name,
    }


@router.get(
    "/me",
    response_model=UserResponse,
)
def read_current_user(
    current_user: UserModel = Depends(get_current_user),
):

    return current_user