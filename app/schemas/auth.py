from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):

    email: EmailStr

    full_name: str = Field(
        min_length=2,
        max_length=120
    )

    password: str = Field(
        min_length=8,
        max_length=128
    )

    requested_account_type: Literal["turista", "operador_turistico"] = "turista"


class UserResponse(BaseModel):

    id: int

    email: EmailStr

    full_name: str

    rol: str

    is_active: bool = True

    model_config = {
        "from_attributes": True
    }


class Token(BaseModel):

    access_token: str

    token_type: str = "bearer"

    rol: str

    full_name: str


class TokenData(BaseModel):

    email: Optional[str] = None