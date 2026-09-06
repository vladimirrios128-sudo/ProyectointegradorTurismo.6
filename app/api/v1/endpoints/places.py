from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List
from app.schemas.places import PlaceCreate, PlaceResponse
from app.db.session import get_db
from app.db.models import PlaceModel

router = APIRouter()

@router.get("/", response_model=List[PlaceResponse], summary="Obtener todos los puntos turisticos")
def get_places(db: Session = Depends(get_db)):
    return db.query(PlaceModel).all()

@router.post("/", response_model=PlaceResponse, status_code=status.HTTP_201_CREATED, summary="Registrar nuevo punto turistico")
def create_place(place_in: PlaceCreate, db: Session = Depends(get_db)):
    db_place = db.query(PlaceModel).filter(PlaceModel.id == place_in.id).first()
    if db_place:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un punto turistico con ese ID."
        )
    new_place = PlaceModel(
        id=place_in.id,
        name=place_in.name,
        category=place_in.category,
        latitude=place_in.latitude,
        longitude=place_in.longitude
    )
    db.add(new_place)
    db.commit()
    db.refresh(new_place)
    return new_place

@router.get("/{place_id}", response_model=PlaceResponse, summary="Obtener detalle de un punto turistico por ID")
def get_place(place_id: str, db: Session = Depends(get_db)):
    place = db.query(PlaceModel).filter(PlaceModel.id == place_id).first()
    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Punto turistico no encontrado."
        )
    return place
