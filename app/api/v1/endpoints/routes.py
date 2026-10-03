from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.routes import RouteCreate, RouteRequest, RouteResponse
from app.services.route_engine import route_engine

router = APIRouter()

@router.post("/", status_code=201)
def create_route(route_in: RouteCreate, db: Session = Depends(get_db)):
    # TODO: Connect this endpoint to the final SQLAlchemy route model.
    # db.add(db_route)
    # db.commit()
    return {
        "status": "success",
        "message": f"Ruta '{route_in.name}' guardada exitosamente."
    }

@router.post("/calculate", response_model=RouteResponse, summary="Calcular ruta optima")
def calculate_route(request: RouteRequest):
    result = route_engine.calculate_shortest_path(request.origin_id, request.destination_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontro una ruta valida entre los puntos especificados."
        )
    return result
