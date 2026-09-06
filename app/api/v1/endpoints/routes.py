from fastapi import APIRouter, HTTPException, status
from app.schemas.routes import RouteRequest, RouteResponse
from app.services.route_engine import route_engine

router = APIRouter()

@router.post("/calculate", response_model=RouteResponse, summary="Calcular ruta optima")
def calculate_route(request: RouteRequest):
    result = route_engine.calculate_shortest_path(request.origin_id, request.destination_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontro una ruta valida entre los puntos especificados."
        )
    return result
