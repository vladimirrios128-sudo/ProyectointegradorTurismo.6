from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None
