from pydantic import BaseModel
from typing import Optional

class PlaceBase(BaseModel):
    id: str
    name: str
    category: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PlaceCreate(PlaceBase):
    pass

class PlaceResponse(PlaceBase):
    class Config:
        from_attributes = True
