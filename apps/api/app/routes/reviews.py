from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.card import Card
from app.models.listing import Listing, ListingStatus
from app.models.notification import NotificationType
from app.models.review import SellerReview
from app.models.user import User
from app.schemas.review import (
    ReviewCreate,
    ReviewEligibilityResponse,
    ReviewListResponse,
    ReviewResponse,
)
from app.services.notifications import actor_meta, create_notification
from app.services.reviews import seller_rating

router = APIRouter(prefix="/reviews", tags=["reviews"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _format_rating(rating: float) -> str:
    """Drop the trailing ".0" so whole stars read "5-star", halves "4.5-star"."""
    return f"{rating:g}"


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


def _completed_purchase(db: Session, buyer_id: UUID, seller_id: UUID) -> Listing | None:
    """The sale, if any, that entitles this buyer to review this seller.

    A pair can trade more than once but carries only one review, so where there
    are several sales the most recent is the one the review hangs off.
    """
    return db.scalar(
        select(Listing)
        .where(
            Listing.seller_id == seller_id,
            Listing.buyer_id == buyer_id,
            Listing.status == ListingStatus.SOLD,
        )
        .order_by(Listing.updated_at.desc())
        .limit(1)
    )


def _existing_review_id(db: Session, reviewer_id: UUID, seller_id: UUID) -> UUID | None:
    return db.scalar(
        select(SellerReview.id).where(
            SellerReview.reviewer_id == reviewer_id,
            SellerReview.seller_id == seller_id,
        )
    )


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


@router.get("/seller/{username}/eligibility", response_model=ReviewEligibilityResponse)
def seller_review_eligibility(
    username: str,
    current_user: CurrentUser,
    db: DbSession,
) -> ReviewEligibilityResponse:
    """Lets the UI offer a review form only to buyers the POST would accept."""
    seller = _get_seller(db, username)
    if seller.id == current_user.id:
        return ReviewEligibilityResponse(can_review=False, already_reviewed=False)

    already_reviewed = _existing_review_id(db, current_user.id, seller.id) is not None
    purchase = _completed_purchase(db, current_user.id, seller.id)
    if purchase is None:
        return ReviewEligibilityResponse(can_review=False, already_reviewed=already_reviewed)

    card = db.get(Card, purchase.card_id)
    return ReviewEligibilityResponse(
        can_review=not already_reviewed,
        already_reviewed=already_reviewed,
        listing_id=purchase.id,
        listing_card_name=card.name if card else None,
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

    purchase = _completed_purchase(db, current_user.id, seller.id)
    if purchase is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only review a seller after completing a sale with them",
        )

    if _existing_review_id(db, current_user.id, seller.id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already reviewed this seller")

    # Defaults to the sale that earned the review; a client can name another one,
    # but only among its own completed sales with this seller.
    listing_id = purchase.id
    if payload.listing_id is not None and payload.listing_id != purchase.id:
        chosen = db.scalar(
            select(Listing.id).where(
                Listing.id == payload.listing_id,
                Listing.seller_id == seller.id,
                Listing.buyer_id == current_user.id,
                Listing.status == ListingStatus.SOLD,
            )
        )
        if chosen is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That listing is not a sale you completed with this seller",
            )
        listing_id = chosen

    comment = payload.comment.strip() if payload.comment else None
    review = SellerReview(
        reviewer_id=current_user.id,
        seller_id=seller.id,
        listing_id=listing_id,
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
        body=f"left you a {_format_rating(payload.rating)}-star review",
        meta={
            "review_id": str(review.id),
            "seller_username": seller.username,
            "reviewer_username": current_user.username,
            **actor_meta(current_user),
        },
    )
    return _review_response(db, review)
