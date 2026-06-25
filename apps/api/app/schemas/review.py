from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=500)
    listing_id: UUID | None = None


class ReviewResponse(BaseModel):
    id: UUID
    reviewer_username: str
    rating: int
    comment: str | None
    created_at: datetime


class ReviewListResponse(BaseModel):
    reviews: list[ReviewResponse]
    avg_rating: float | None
    review_count: int
