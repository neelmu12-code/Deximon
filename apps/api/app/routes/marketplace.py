from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.card import Card
from app.models.listing import Listing, ListingStatus
from app.models.user import User
from app.schemas.binder import HoloType
from app.schemas.marketplace import (
    ListingCardResponse,
    ListingCreate,
    ListingResponse,
    ListingSellerResponse,
    ListingUpdate,
)

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


def _listing_response(db: Session, listing: Listing) -> ListingResponse:
    card = db.get(Card, listing.card_id)
    seller = db.scalar(
        select(User).options(selectinload(User.profile)).where(User.id == listing.seller_id)
    )
    if card is None or seller is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    return ListingResponse(
        id=listing.id,
        card_id=listing.card_id,
        seller_id=listing.seller_id,
        asking_price=_price_to_float(listing.asking_price),
        status=listing.status,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
        card=ListingCardResponse(
            id=card.id,
            name=card.name,
            set_code=card.set_code,
            number=card.number,
            rarity=card.rarity,
            condition=card.condition,
            language=card.language,
            holo_type=_holo_type(card),
        ),
        seller=ListingSellerResponse(
            id=seller.id,
            username=seller.username,
            display_name=seller.profile.display_name if seller.profile else None,
            avatar_url=seller.profile.avatar_url if seller.profile else None,
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
    set_code: Annotated[str | None, Query(max_length=20)] = None,
    rarity: Annotated[str | None, Query(max_length=40)] = None,
    condition: Annotated[str | None, Query(max_length=20)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 24,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ListingResponse]:
    stmt = select(Listing).join(Card, Listing.card_id == Card.id)

    if status_filter is None:
        stmt = stmt.where(Listing.status != ListingStatus.CANCELLED)
    else:
        stmt = stmt.where(Listing.status == status_filter)

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
    if condition:
        stmt = stmt.where(Card.condition.ilike(condition))

    listings = db.scalars(stmt.order_by(Listing.created_at.desc()).offset(offset).limit(limit))
    return [_listing_response(db, listing) for listing in listings]


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
def update_listing(
    listing_id: UUID,
    payload: ListingUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> ListingResponse:
    listing = _get_listing(db, listing_id)
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your listing")

    updates = payload.model_dump(exclude_unset=True)
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

    db.commit()
    db.refresh(listing)
    return _listing_response(db, listing)
