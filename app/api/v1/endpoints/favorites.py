"""
Endpoints de Favoritos para Turistas y Usuarios Autenticados
Turismo Inteligente - Colombia
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import Favorite, Place, User
from app.db.session import get_db
from app.schemas.places import PlaceResponse

router = APIRouter()


@router.get("", response_model=List[PlaceResponse])
def get_user_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna los lugares turísticos marcados como favoritos por el usuario actual."""
    favorites = (
        db.query(Place)
        .join(Favorite, Favorite.place_id == Place.id)
        .filter(Favorite.user_id == current_user.id)
        .all()
    )
    return favorites


@router.post("/{place_id}", status_code=status.HTTP_201_CREATED)
def add_favorite(
    place_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Añade un lugar a la lista de favoritos personal del usuario."""
    place = db.query(Place).filter(Place.id == place_id).first()
    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El lugar turístico no existe.",
        )

    existing = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.place_id == place_id)
        .first()
    )
    if existing:
        return {"message": "El lugar ya se encontraba en tus favoritos.", "place_id": place_id}

    fav = Favorite(user_id=current_user.id, place_id=place_id)
    db.add(fav)
    db.commit()
    return {"message": "Lugar añadido con éxito a favoritos.", "place_id": place_id}


@router.delete("/{place_id}", status_code=status.HTTP_200_OK)
def remove_favorite(
    place_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remueve un lugar de la lista de favoritos personal."""
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.place_id == place_id)
        .first()
    )
    if not fav:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El lugar no está en tu lista de favoritos.",
        )

    db.delete(fav)
    db.commit()
    return {"message": "Lugar removido de favoritos.", "place_id": place_id}
