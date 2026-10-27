"""
Esquemas Pydantic para Gestión de Lugares Turísticos
Turismo Inteligente - Colombia
"""
from datetime import datetime
from typing import Optional
from pydantic import AliasPath, BaseModel, Field


class PlaceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200, example="Parque Nacional Natural El Cocuy")
    description: str = Field(..., min_length=10, example="Majestuosa sierra nevada con más de 25 picos nevados y lagunas glaciares.")
    category: str = Field(..., example="Aventura")  # Aventura, Cultural, Histórico, Gastronómico
    department: str = Field(..., example="Boyacá")
    city: str = Field(..., example="El Cocuy")
    latitude: float = Field(..., example=6.4678)
    longitude: float = Field(..., example=-72.3167)
    entry_fee: float = Field(default=0.0, ge=0.0, example=35000.0)
    image_url: Optional[str] = None


class PlaceCreate(PlaceBase):
    description: str = Field(..., min_length=10)


class PlaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    entry_fee: Optional[float] = None
    image_url: Optional[str] = None
    is_verified: Optional[bool] = None  # Solo administradores pueden alterar este campo


class PlaceResponse(PlaceBase):
    id: int
    rating: float
    is_verified: bool
    merchant_id: int
    merchant_name: str = Field(validation_alias=AliasPath("merchant", "full_name"))
    created_at: datetime

    class Config:
        from_attributes = True
