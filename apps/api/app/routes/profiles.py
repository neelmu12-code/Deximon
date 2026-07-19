import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.card import Card
from app.models.listing import Listing, ListingStatus
from app.models.user import User
from app.schemas.user import (
    PrivacyUpdateRequest,
    ProfileResponse,
    ProfileStatsResponse,
    ProfileUpdateRequest,
)
from app.services.reviews import seller_rating

router = APIRouter(prefix="/profiles", tags=["profiles"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

_USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,30}$")
_ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
_AVATAR_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
_MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB


def _profile_response(user: User, db: Session) -> ProfileResponse:
    avg_rating, review_count = seller_rating(db, user.id)
    return ProfileResponse(
        username=user.username,
        display_name=user.profile.display_name,
        bio=user.profile.bio,
        avatar_url=user.profile.avatar_url,
        binder_visibility="public" if user.profile.binder_public else "private",
        location=user.profile.location,
        twitter_handle=user.profile.twitter_handle,
        instagram_handle=user.profile.instagram_handle,
        avg_rating=avg_rating,
        review_count=review_count,
    )


# Static path must be defined before /{username} so FastAPI matches it first.
@router.get("/check-username")
def check_username(username: str, db: DbSession) -> dict[str, bool]:
    if not _USERNAME_RE.match(username):
        return {"available": False}
    taken = db.scalar(
        select(User.id).where(func.lower(User.username) == username.lower())
    )
    return {"available": taken is None}


@router.get("/{username}", response_model=ProfileResponse)
def public_profile(username: str, db: DbSession) -> ProfileResponse:
    user = db.scalar(
        select(User)
        .options(selectinload(User.profile))
        .where(func.lower(User.username) == username.lower(), User.is_active.is_(True))
    )
    if user is None or user.profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return _profile_response(user, db)


@router.get("/{username}/stats", response_model=ProfileStatsResponse)
def profile_stats(username: str, db: DbSession) -> ProfileStatsResponse:
    user_id = db.scalar(
        select(User.id).where(
            func.lower(User.username) == username.lower(), User.is_active.is_(True)
        )
    )
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    cards_owned = (
        db.scalar(select(func.count()).select_from(Card).where(Card.owner_id == user_id)) or 0
    )
    # "Listed" is what's currently on the market — available or on hold, not sold/cancelled.
    cards_listed = (
        db.scalar(
            select(func.count())
            .select_from(Listing)
            .where(
                Listing.seller_id == user_id,
                Listing.status.in_([ListingStatus.AVAILABLE, ListingStatus.ON_HOLD]),
            )
        )
        or 0
    )
    # No separate trade record exists, so a completed trade is a sold listing.
    completed_trades = (
        db.scalar(
            select(func.count())
            .select_from(Listing)
            .where(Listing.seller_id == user_id, Listing.status == ListingStatus.SOLD)
        )
        or 0
    )
    return ProfileStatsResponse(
        cards_owned=cards_owned,
        cards_listed=cards_listed,
        completed_trades=completed_trades,
    )


@router.patch("/me", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ProfileResponse:
    updates = payload.model_dump(exclude_unset=True)

    # username lives on User, not Profile — handle separately
    new_username = updates.pop("username", None)
    if new_username and new_username != current_user.username:
        conflict = db.scalar(
            select(User.id).where(
                func.lower(User.username) == new_username,
                User.id != current_user.id,
            )
        )
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already taken")
        current_user.username = new_username

    if "avatar_url" in updates and updates["avatar_url"] is not None:
        updates["avatar_url"] = str(updates["avatar_url"])

    for field, value in updates.items():
        setattr(current_user.profile, field, value)

    current_user.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(current_user)
    db.refresh(current_user.profile)
    return _profile_response(current_user, db)


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile,
    current_user: CurrentUser,
    settings: SettingsDep,
) -> dict[str, str]:
    if file.content_type not in _ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar must be a JPEG, PNG, or WebP image.",
        )

    content = await file.read()
    if len(content) > _MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar must be under 5 MB.",
        )

    ext = _AVATAR_EXT[file.content_type]
    avatar_dir = Path(settings.upload_dir) / "avatars"
    avatar_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{current_user.id}.{ext}"
    (avatar_dir / filename).write_bytes(content)

    url = f"{settings.backend_base_url}/static/avatars/{filename}"
    return {"url": url}


@router.patch("/me/privacy", response_model=ProfileResponse)
def update_privacy(
    payload: PrivacyUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ProfileResponse:
    current_user.profile.binder_public = payload.binder_visibility == "public"
    current_user.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(current_user.profile)
    return _profile_response(current_user, db)
