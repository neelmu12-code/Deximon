from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import PrivacyUpdateRequest, ProfileResponse, ProfileUpdateRequest

router = APIRouter(prefix="/profiles", tags=["profiles"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _profile_response(user: User) -> ProfileResponse:
    return ProfileResponse(
        username=user.username,
        display_name=user.profile.display_name,
        bio=user.profile.bio,
        avatar_url=user.profile.avatar_url,
        binder_visibility="public" if user.profile.binder_public else "private",
    )


@router.get("/{username}", response_model=ProfileResponse)
def public_profile(username: str, db: DbSession) -> ProfileResponse:
    user = db.scalar(
        select(User)
        .options(selectinload(User.profile))
        .where(func.lower(User.username) == username.lower(), User.is_active.is_(True))
    )
    if user is None or user.profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return _profile_response(user)


@router.patch("/me", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ProfileResponse:
    updates = payload.model_dump(exclude_unset=True)
    if "avatar_url" in updates and updates["avatar_url"] is not None:
        updates["avatar_url"] = str(updates["avatar_url"])
    for field, value in updates.items():
        setattr(current_user.profile, field, value)
    current_user.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(current_user.profile)
    return _profile_response(current_user)


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
    return _profile_response(current_user)
