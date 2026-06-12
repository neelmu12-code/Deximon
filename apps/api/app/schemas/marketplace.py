from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.listing import ListingStatus
from app.schemas.binder import HoloType


class ListingCreate(BaseModel):
    card_id: UUID
    asking_price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)


class ListingUpdate(BaseModel):
    asking_price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    status: ListingStatus | None = None


class ListingCardResponse(BaseModel):
    id: UUID
    name: str
    set_code: str | None
    number: str | None
    rarity: str | None
    condition: str | None
    language: str | None
    holo_type: HoloType


class ListingSellerResponse(BaseModel):
    id: UUID
    username: str
    display_name: str | None
    avatar_url: str | None


class ListingResponse(BaseModel):
    id: UUID
    card_id: UUID
    seller_id: UUID
    asking_price: float | None
    status: ListingStatus
    created_at: datetime
    updated_at: datetime
    card: ListingCardResponse
    seller: ListingSellerResponse
