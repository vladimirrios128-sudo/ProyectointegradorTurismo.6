"""
Endpoints de Cálculo y Optimización de Rutas Turísticas Inteligentes
Turismo Inteligente - Colombia
"""
from typing import List, Optional
import math
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()


class RouteStop(BaseModel):
    place_id: int
    name: str
    latitude: float
    longitude: float


class RouteCalculationRequest(BaseModel):
    origin: RouteStop
    destination: RouteStop
    waypoints: Optional[List[RouteStop]] = []
    transport_mode: str = "vehicle"  # 'vehicle', 'bus', 'walking'


class RouteLeg(BaseModel):
    from_name: str
    to_name: str
    distance_km: float
    estimated_duration_min: int


class RouteCalculationResponse(BaseModel):
    transport_mode: str
    total_distance_km: float
    total_duration_hours: float
    legs: List[RouteLeg]
    coordinates: List[List[float]]
    cultural_tips: List[str]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula la distancia geodésica en kilómetros usando la fórmula de Haversine."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


@router.post("/calculate", response_model=RouteCalculationResponse)
def calculate_tourist_route(request: RouteCalculationRequest):
    """
    Calcula una ruta turística entre dos o más puntos geográficos en Colombia
    considerando el medio de transporte seleccionado (Vehículo, Autobús o Caminata).
    """
    points = [request.origin] + (request.waypoints or []) + [request.destination]
    if len(points) < 2:
        raise HTTPException(status_code=400, detail="Se requieren al menos dos puntos para trazar la ruta.")

    speed_map = {
        "vehicle": 60.0,   # 60 km/h promedio en topografía colombiana
        "bus": 45.0,       # 45 km/h intermunicipal
        "walking": 4.5,    # 4.5 km/h senderismo/caminata
    }
    speed = speed_map.get(request.transport_mode, 50.0)

    legs: List[RouteLeg] = []
    total_dist = 0.0
    coordinates: List[List[float]] = []

    for i in range(len(points) - 1):
        p1 = points[i]
        p2 = points[i + 1]
        dist = haversine_km(p1.latitude, p1.longitude, p2.latitude, p2.longitude)
        # Factor de sinuosidad vial de montaña en Colombia (~1.3x)
        adjusted_dist = round(dist * (1.35 if request.transport_mode != "walking" else 1.15), 1)
        duration_minutes = int((adjusted_dist / speed) * 60)

        total_dist += adjusted_dist
        legs.append(
            RouteLeg(
                from_name=p1.name,
                to_name=p2.name,
                distance_km=adjusted_dist,
                estimated_duration_min=duration_minutes,
            )
        )
        coordinates.append([p1.latitude, p1.longitude])

    coordinates.append([points[-1].latitude, points[-1].longitude])

    total_hours = round(total_dist / speed, 1)

    tips = [
        "Lleva siempre ropa en capas debido a los pisos térmicos de Colombia (del páramo a la costa tropical).",
        "Apoya a los comerciantes y guías certificados locales en cada parada del camino.",
        "Respeta los ecosistemas frágiles como frailejones y corales marinos; viaja con baja huella de carbono.",
    ]

    return RouteCalculationResponse(
        transport_mode=request.transport_mode,
        total_distance_km=round(total_dist, 1),
        total_duration_hours=total_hours,
        legs=legs,
        coordinates=coordinates,
        cultural_tips=tips,
    )
