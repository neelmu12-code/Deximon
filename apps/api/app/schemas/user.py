from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, field_validator

BinderVisibility = Literal["public", "private"]


class ProfileResponse(BaseModel):
    username: str
    display_name: str | None
    bio: str | None
    avatar_url: str | None
    binder_visibility: BinderVisibility
    binder_cover: dict[str, Any] | None = None
    location: str | None
    twitter_handle: str | None
    instagram_handle: str | None
    avg_rating: float | None = None
    review_count: int = 0


class ProfileStatsResponse(BaseModel):
    cards_owned: int
    cards_listed: int
    completed_trades: int


class MeResponse(ProfileResponse):
    id: UUID
    email: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProfileUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=500)
    avatar_url: HttpUrl | None = None
    username: str | None = Field(
        default=None, min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_]+$"
    )
    location: str | None = Field(default=None, max_length=100)
    twitter_handle: str | None = Field(default=None, max_length=50)
    instagram_handle: str | None = Field(default=None, max_length=50)
    binder_cover: dict[str, Any] | None = None

    @field_validator("display_name", "bio")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped and value:
            raise ValueError("value cannot be blank")
        return stripped

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str | None) -> str | None:
        return value.lower() if value else value

    @field_validator("twitter_handle", "instagram_handle")
    @classmethod
    def strip_at_prefix(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.lstrip("@").strip() or None

    @field_validator("location")
    @classmethod
    def strip_location(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class PrivacyUpdateRequest(BaseModel):
    binder_visibility: BinderVisibility
