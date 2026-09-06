from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.auth import UserCreate, UserResponse, Token
from app.core.security import get_password_hash, verify_password, create_access_token

router = APIRouter()

db_users = {}

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Registrar nuevo usuario")
def register_user(user_in: UserCreate):
    if user_in.email in db_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electronico ya se encuentra registrado."
        )
    hashed_pwd = get_password_hash(user_in.password)
    user_id = str(len(db_users) + 1)
    user_data = {
        "id": user_id,
        "email": user_in.email,
        "full_name": user_in.full_name,
        "hashed_password": hashed_pwd,
        "is_active": True
    }
    db_users[user_in.email] = user_data
    return user_data

@router.post("/login", response_model=Token, summary="Iniciar sesion para obtener Token JWT")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = db_users.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}
