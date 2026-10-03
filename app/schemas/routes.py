from pydantic import BaseModel
from typing import List

class RouteRequest(BaseModel):
    origin_id: str
    destination_id: str

class RouteCreate(BaseModel):
    name: str
    destination: str
    description: str
    price: float

class LocationDetail(BaseModel):
    id: str
    name: str
    category: str

class RouteResponse(BaseModel):
    total_time_minutes: float
    route: List[LocationDetail]
