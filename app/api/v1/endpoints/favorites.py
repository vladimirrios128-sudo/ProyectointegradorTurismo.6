from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.deps import get_current_user
from app.db.models import FavoriteModel, UserModel
from app.db.session import get_db

router = APIRouter()


class FavoriteCreate(BaseModel):
    place_name: str = Field(min_length=1, max_length=180)


@router.post("/")
def toggle_favorite(
    favorite: FavoriteCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(FavoriteModel)
        .filter(
            FavoriteModel.user_id == current_user.id,
            FavoriteModel.place_name == favorite.place_name,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "removed", "message": "Eliminado de favoritos."}

    db.add(FavoriteModel(user_id=current_user.id, place_name=favorite.place_name))
    db.commit()
    return {"status": "added", "message": "Añadido a favoritos."}


@router.get("/")
def get_favorites(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    favorites = (
        db.query(FavoriteModel)
        .filter(FavoriteModel.user_id == current_user.id)
        .all()
    )
    return [item.place_name for item in favorites]
