from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.card import Card
from app.models.chat import Conversation
from app.models.listing import Listing, ListingStatus
from app.models.notification import NotificationType
from app.models.user import User
from app.schemas.binder import HoloType
from app.schemas.marketplace import (
    ListingCardResponse,
    ListingCreate,
    ListingResponse,
    ListingSellerResponse,
    ListingUpdate,
)
from app.services.notifications import actor_meta, create_notification
from app.services.reviews import seller_rating, seller_ratings

router = APIRouter(prefix="/market/listings", tags=["marketplace"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

_ALLOWED_STATUS_TRANSITIONS: dict[ListingStatus, set[ListingStatus]] = {
    ListingStatus.AVAILABLE: {
        ListingStatus.ON_HOLD,
        ListingStatus.SOLD,
        ListingStatus.CANCELLED,
    },
    ListingStatus.ON_HOLD: {
        ListingStatus.AVAILABLE,
        ListingStatus.SOLD,
        ListingStatus.CANCELLED,
    },
    ListingStatus.SOLD: set(),
    ListingStatus.CANCELLED: set(),
}


def _holo_type(card: Card) -> HoloType:
    if card.is_reverse_holo:
        return "reverse_holo"
    if card.is_holo:
        return "holo"
    return "normal"


def _price_to_float(value: float | None) -> float | None:
    return None if value is None else float(value)


def _listing_response(
    db: Session,
    listing: Listing,
    ratings: dict[UUID, tuple[float | None, int]] | None = None,
) -> ListingResponse:
    card = db.get(Card, listing.card_id)
    seller = db.scalar(
        select(User).options(selectinload(User.profile)).where(User.id == listing.seller_id)
    )
    if card is None or seller is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    # On list endpoints the caller passes a prefetched ratings map so we don't
    # run an avg+count query per listing; single-listing callers leave it None.
    if ratings is not None:
        avg_rating, review_count = ratings.get(seller.id, (None, 0))
    else:
        avg_rating, review_count = seller_rating(db, seller.id)

    return ListingResponse(
        id=listing.id,
        card_id=listing.card_id,
        seller_id=listing.seller_id,
        asking_price=_price_to_float(listing.asking_price),
        notes=listing.notes,
        status=listing.status,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
        card=ListingCardResponse(
            id=card.id,
            name=card.name,
            set_code=card.set_code,
            number=card.number,
            rarity=card.rarity,
            card_type=card.card_type,
            condition=card.condition,
            language=card.language,
            holo_type=_holo_type(card),
            image_url=card.image_url,
        ),
        seller=ListingSellerResponse(
            id=seller.id,
            username=seller.username,
            display_name=seller.profile.display_name if seller.profile else None,
            avatar_url=seller.profile.avatar_url if seller.profile else None,
            avg_rating=avg_rating,
            review_count=review_count,
        ),
    )


def _get_listing(db: Session, listing_id: UUID) -> Listing:
    listing = db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing


@router.get("", response_model=list[ListingResponse])
def list_listings(
    db: DbSession,
    q: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    status_filter: Annotated[ListingStatus | None, Query(alias="status")] = None,
    set_code: Annotated[str | None, Query(alias="set", max_length=20)] = None,
    rarity: Annotated[str | None, Query(max_length=40)] = None,
    card_type: Annotated[str | None, Query(alias="type", max_length=40)] = None,
    condition: Annotated[str | None, Query(max_length=20)] = None,
    seller: Annotated[str | None, Query(max_length=30)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 24,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ListingResponse]:
    stmt = select(Listing).join(Card, Listing.card_id == Card.id)

    if status_filter is None:
        stmt = stmt.where(Listing.status != ListingStatus.CANCELLED)
    else:
        stmt = stmt.where(Listing.status == status_filter)

    if seller:
        stmt = stmt.join(User, Listing.seller_id == User.id).where(
            func.lower(User.username) == seller.lower()
        )

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Card.name.ilike(pattern),
                Card.set_code.ilike(pattern),
                Card.number.ilike(pattern),
            )
        )
    if set_code:
        stmt = stmt.where(Card.set_code.ilike(set_code))
    if rarity:
        stmt = stmt.where(Card.rarity.ilike(rarity))
    if card_type:
        stmt = stmt.where(Card.card_type.ilike(card_type))
    if condition:
        stmt = stmt.where(Card.condition.ilike(condition))

    listings = list(db.scalars(stmt.order_by(Listing.created_at.desc()).offset(offset).limit(limit)))
    ratings = seller_ratings(db, {listing.seller_id for listing in listings})
    return [_listing_response(db, listing, ratings) for listing in listings]


@router.post("", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: ListingCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> ListingResponse:
    card = db.get(Card, payload.card_id)
    if card is None or card.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    existing = db.scalar(select(Listing.id).where(Listing.card_id == payload.card_id))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This card is already listed",
        )

    listing = Listing(
        card_id=card.id,
        seller_id=current_user.id,
        asking_price=float(payload.asking_price) if payload.asking_price is not None else None,
        notes=payload.notes,
        status=ListingStatus.AVAILABLE,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return _listing_response(db, listing)


@router.get("/{listing_id}", response_model=ListingResponse)
def get_listing(listing_id: UUID, db: DbSession) -> ListingResponse:
    return _listing_response(db, _get_listing(db, listing_id))


@router.patch("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: UUID,
    payload: ListingUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> ListingResponse:
    listing = _get_listing(db, listing_id)
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your listing")

    updates = payload.model_dump(exclude_unset=True)
    old_status = listing.status
    if "status" in updates and updates["status"] is not None:
        new_status = updates["status"]
        if new_status != listing.status and new_status not in _ALLOWED_STATUS_TRANSITIONS[listing.status]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid listing status transition",
            )
        listing.status = new_status

    if "asking_price" in updates:
        asking_price = updates["asking_price"]
        listing.asking_price = float(asking_price) if asking_price is not None else None

    if "notes" in updates:
        listing.notes = updates["notes"]

    db.commit()
    db.refresh(listing)

    if "status" in updates and updates["status"] is not None and listing.status != old_status:
        card = db.get(Card, listing.card_id)
        card_name = card.name if card else "a listing"
        conversations = db.scalars(select(Conversation).where(Conversation.listing_id == listing.id))
        for conversation in conversations:
            await create_notification(
                db,
                user_id=conversation.requester_id,
                type=NotificationType.listing_status,
                title=current_user.username,
                body=f"changed {card_name} to {listing.status.value.replace('_', ' ')}",
                meta={
                    "listing_id": str(listing.id),
                    "status": listing.status.value,
                    **actor_meta(current_user),
                },
            )

    return _listing_response(db, listing)
