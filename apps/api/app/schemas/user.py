from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, field_validator

BinderVisibility = Literal["public", "private"]


class ProfileResponse(BaseModel):
    username: str
    display_name: str | None
    bio: str | None
    avatar_url: str | None
    binder_visibility: BinderVisibility


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

    @field_validator("display_name", "bio")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped and value:
            raise ValueError("value cannot be blank")
        return stripped


class PrivacyUpdateRequest(BaseModel):
    binder_visibility: BinderVisibility
