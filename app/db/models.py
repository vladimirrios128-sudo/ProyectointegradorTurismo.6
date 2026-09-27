from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Float
from sqlalchemy.orm import relationship

from app.db.session import Base


class UserModel(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    full_name = Column(
        String(120),
        nullable=False
    )

    hashed_password = Column(
        String(255),
        nullable=False
    )

    # ROL OCULTO PARA EL USUARIO
    rol = Column(
        String(30),
        nullable=False,
        default="turista"
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    reviews = relationship(
        "ReviewModel",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    favorites = relationship(
        "FavoriteModel",
        back_populates="user",
        cascade="all, delete-orphan"
    )

class PlaceModel(Base):
    __tablename__ = "places"

    id = Column(String(80), primary_key=True, index=True)
    name = Column(String(180), nullable=False)
    category = Column(String(60), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)


class ReviewModel(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    place_name = Column(String(180), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(String(1000), nullable=False)
    created_at = Column(DateTime, nullable=False)

    user = relationship("UserModel", back_populates="reviews")


class FavoriteModel(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    place_name = Column(String(180), nullable=False)

    user = relationship("UserModel", back_populates="favorites")
