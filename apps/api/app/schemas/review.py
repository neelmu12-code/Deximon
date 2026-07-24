from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

MAX_COMMENT_CHARS = 250


class ReviewCreate(BaseModel):
    # Half stars are allowed: 0.5, 1.0, 1.5, ... 5.0.
    rating: float = Field(ge=0.5, le=5)
    comment: str | None = Field(default=None, max_length=MAX_COMMENT_CHARS)
    listing_id: UUID | None = None

    @field_validator("rating")
    @classmethod
    def rating_in_half_steps(cls, value: float) -> float:
        if (value * 2) % 1 != 0:
            raise ValueError("rating must be a whole or half star (e.g. 4 or 4.5)")
        return value


class ReviewResponse(BaseModel):
    id: UUID
    reviewer_username: str
    rating: float
    comment: str | None
    created_at: datetime


class ReviewEligibilityResponse(BaseModel):
    """Whether the caller may review this seller, and what sale earns it."""

    can_review: bool
    already_reviewed: bool
    listing_id: UUID | None = None
    listing_card_name: str | None = None


class ReviewListResponse(BaseModel):
    reviews: list[ReviewResponse]
    avg_rating: float | None
    review_count: int
