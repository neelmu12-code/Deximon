from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

HoloType = Literal["normal", "holo", "reverse_holo"]


class OwnedCardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    set_code: str | None = Field(default=None, max_length=20)
    number: str | None = Field(default=None, max_length=20)
    rarity: str | None = Field(default=None, max_length=40)
    card_type: str | None = Field(default=None, max_length=40)
    condition: str | None = Field(default=None, max_length=20)
    language: str | None = Field(default=None, max_length=10)
    holo_type: HoloType = "normal"
    image_url: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=500)


class OwnedCardResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    set_code: str | None
    number: str | None
    rarity: str | None
    card_type: str | None
    condition: str | None
    language: str | None
    holo_type: HoloType
    image_url: str | None
    notes: str | None
    created_at: datetime


class OwnedCardUpdate(BaseModel):
    condition: str | None = Field(default=None, max_length=20)
    language: str | None = Field(default=None, max_length=10)
    holo_type: HoloType | None = None
    notes: str | None = Field(default=None, max_length=500)


class BinderSlotSetRequest(BaseModel):
    card_id: UUID | None = None


class BinderMoveRequest(BaseModel):
    from_page_index: int = Field(ge=0)
    from_slot_index: int = Field(ge=0, le=8)
    to_page_index: int = Field(ge=0)
    to_slot_index: int = Field(ge=0, le=8)


class BinderSlotResponse(BaseModel):
    slot_index: int
    card: OwnedCardResponse | None


class BinderPageResponse(BaseModel):
    page_index: int
    slots: list[BinderSlotResponse]


class BinderResponse(BaseModel):
    owner_id: UUID
    pages: list[BinderPageResponse]
