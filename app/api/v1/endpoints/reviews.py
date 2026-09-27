from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import ReviewModel, UserModel
from app.db.session import get_db
from pydantic import BaseModel, Field

router = APIRouter()


class ReviewCreate(BaseModel):
    place_name: str = Field(min_length=1, max_length=180)
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=1, max_length=1000)


@router.get("/{place_name}")
def get_reviews(place_name: str, db: Session = Depends(get_db)):
    reviews = (
        db.query(ReviewModel)
        .filter(ReviewModel.place_name == place_name)
        .order_by(ReviewModel.created_at.desc())
        .all()
    )
    return [
        {
            "user_name": review.user.full_name,
            "rating": review.rating,
            "comment": review.comment,
            "date": review.created_at.strftime("%Y-%m-%d"),
        }
        for review in reviews
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_review(
    review: ReviewCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = ReviewModel(
        user_id=current_user.id,
        place_name=review.place_name,
        rating=review.rating,
        comment=review.comment,
        created_at=datetime.now(timezone.utc),
    )
    db.add(item)
    db.commit()
    return {"message": "Reseña guardada exitosamente."}
