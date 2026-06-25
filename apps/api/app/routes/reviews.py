from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.notification import NotificationType
from app.models.review import SellerReview
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewListResponse, ReviewResponse
from app.services.notifications import actor_meta, create_notification
from app.services.reviews import seller_rating

router = APIRouter(prefix="/reviews", tags=["reviews"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _review_response(db: Session, review: SellerReview) -> ReviewResponse:
    reviewer = db.get(User, review.reviewer_id)
    if reviewer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return ReviewResponse(
        id=review.id,
        reviewer_username=reviewer.username,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    )


def _get_seller(db: Session, username: str) -> User:
    seller = db.scalar(
        select(User)
        .options(selectinload(User.profile))
        .where(func.lower(User.username) == username.lower(), User.is_active.is_(True))
    )
    if seller is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seller not found")
    return seller


@router.get("/seller/{username}", response_model=ReviewListResponse)
def list_seller_reviews(username: str, db: DbSession) -> ReviewListResponse:
    seller = _get_seller(db, username)
    reviews = db.scalars(
        select(SellerReview)
        .where(SellerReview.seller_id == seller.id)
        .order_by(SellerReview.created_at.desc())
    )
    avg_rating, review_count = seller_rating(db, seller.id)
    return ReviewListResponse(
        reviews=[_review_response(db, review) for review in reviews],
        avg_rating=avg_rating,
        review_count=review_count,
    )


@router.post("/seller/{username}", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_seller_review(
    username: str,
    payload: ReviewCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> ReviewResponse:
    seller = _get_seller(db, username)
    if seller.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot review yourself")

    existing = db.scalar(
        select(SellerReview.id).where(
            SellerReview.reviewer_id == current_user.id,
            SellerReview.seller_id == seller.id,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already reviewed this seller")

    comment = payload.comment.strip() if payload.comment else None
    review = SellerReview(
        reviewer_id=current_user.id,
        seller_id=seller.id,
        listing_id=payload.listing_id,
        rating=payload.rating,
        comment=comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    await create_notification(
        db,
        user_id=seller.id,
        type=NotificationType.review,
        title=current_user.username,
        body=f"left you a {payload.rating}-star review",
        meta={
            "review_id": str(review.id),
            "seller_username": seller.username,
            "reviewer_username": current_user.username,
            **actor_meta(current_user),
        },
    )
    return _review_response(db, review)
