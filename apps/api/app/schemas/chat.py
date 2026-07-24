from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.listing import ListingStatus


class ConversationCreate(BaseModel):
    listing_id: UUID


class ListingStatusUpdate(BaseModel):
    status: ListingStatus


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    sender_username: str
    body: str
    created_at: datetime


class ConversationResponse(BaseModel):
    id: UUID
    listing_id: UUID
    requester_id: UUID
    seller_id: UUID
    requester_username: str
    seller_username: str
    listing_card_name: str
    listing_price: float | None = None
    listing_image_url: str | None = None
    listing_status: ListingStatus
    listing_buyer_id: UUID | None
    last_message: MessageResponse | None
    unread_count: int = 0
    created_at: datetime


class ConversationDetailResponse(ConversationResponse):
    messages: list[MessageResponse]