import re
from functools import lru_cache
from typing import Annotated, Any, cast
from uuid import uuid4

from authlib.integrations.base_client.errors import OAuthError
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.core.config import Settings, get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import Profile, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import MeResponse

router = APIRouter(prefix="/auth", tags=["auth"])
DbSession = Annotated[Session, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _me_response(user: User) -> MeResponse:
    return MeResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.profile.display_name,
        bio=user.profile.bio,
        avatar_url=user.profile.avatar_url,
        binder_visibility="public" if user.profile.binder_public else "private",
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _set_auth_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/",
    )


def _token_response(user: User, token: str, settings: Settings) -> TokenResponse:
    return TokenResponse(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=_me_response(user),
    )


def _user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email.lower()))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    response: Response,
    db: DbSession,
    settings: SettingsDep,
) -> TokenResponse:
    email = str(payload.email).lower()
    duplicate = db.scalar(
        select(User).where(
            (func.lower(User.email) == email) | (func.lower(User.username) == payload.username)
        )
    )
    if duplicate is not None:
        detail = "Email is already registered" if duplicate.email.lower() == email else "Username is taken"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

    user = User(email=email, username=payload.username, password_hash=hash_password(payload.password))
    user.profile = Profile(display_name=payload.display_name or payload.username, binder_public=True)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username is already in use",
        ) from None
    db.refresh(user)

    token = create_access_token(user, settings)
    _set_auth_cookie(response, token, settings)
    return _token_response(user, token, settings)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: DbSession,
    settings: SettingsDep,
) -> TokenResponse:
    user = _user_by_email(db, str(payload.email))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(user, settings)
    _set_auth_cookie(response, token, settings)
    return _token_response(user, token, settings)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, settings: SettingsDep) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite="lax",
    )


@router.get("/me", response_model=MeResponse)
def me(current_user: CurrentUser) -> MeResponse:
    return _me_response(current_user)


@lru_cache
def _google_oauth(client_id: str, client_secret: str) -> Any:
    oauth = OAuth()
    oauth.register(
        name="google",
        client_id=client_id,
        client_secret=client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
    return oauth.google


def _get_google_client(settings: Settings) -> Any:
    if not settings.google_oauth_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )
    return _google_oauth(settings.google_client_id, settings.google_client_secret)


@router.get("/google/login")
async def google_login(request: Request, settings: SettingsDep) -> Response:
    google = _get_google_client(settings)
    return cast(Response, await google.authorize_redirect(request, settings.google_redirect_uri))


def _oauth_error_redirect(settings: Settings) -> RedirectResponse:
    return RedirectResponse(settings.frontend_auth_error_url, status_code=status.HTTP_302_FOUND)


def _available_google_username(db: Session, email: str) -> str:
    base = re.sub(r"[^a-z0-9_]", "_", email.split("@", 1)[0].lower()).strip("_")
    base = (base or "collector")[:30]
    if len(base) < 3:
        base = f"{base}_user"[:30]
    candidate = base
    while db.scalar(select(User.id).where(func.lower(User.username) == candidate)):
        suffix = uuid4().hex[:8]
        candidate = f"{base[:21]}_{suffix}"
    return candidate


def _google_user(db: Session, userinfo: dict[str, object]) -> User:
    email = str(userinfo["email"]).lower()
    subject = str(userinfo["sub"])
    subject_user = db.scalar(select(User).where(User.google_subject == subject))
    email_user = _user_by_email(db, email)
    if subject_user is not None and email_user is not None and subject_user.id != email_user.id:
        raise ValueError("OAuth identity conflicts with an existing account")

    user = subject_user or email_user
    if user is None:
        display_name = str(userinfo.get("name") or email.split("@", 1)[0])[:80]
        user = User(email=email, username=_available_google_username(db, email), google_subject=subject)
        user.profile = Profile(display_name=display_name, binder_public=True)
        db.add(user)
    else:
        user.google_subject = subject
        if subject_user is not None:
            user.email = email
        if user.profile is None:
            user.profile = Profile(display_name=user.username, binder_public=True)
    return user


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: DbSession,
    settings: SettingsDep,
) -> Response:
    google = _get_google_client(settings)
    try:
        token_data = await google.authorize_access_token(request)
        userinfo = token_data.get("userinfo")
        if not isinstance(userinfo, dict):
            userinfo = await google.userinfo(token=token_data)
        verified = userinfo.get("email_verified") in (True, "true")
        if not verified or not userinfo.get("email") or not userinfo.get("sub"):
            return _oauth_error_redirect(settings)
        user = _google_user(db, userinfo)
        db.commit()
        db.refresh(user)
    except (IntegrityError, KeyError, OAuthError, ValueError):
        db.rollback()
        return _oauth_error_redirect(settings)

    access_token = create_access_token(user, settings)
    response = RedirectResponse(settings.frontend_auth_success_url, status_code=status.HTTP_302_FOUND)
    _set_auth_cookie(response, access_token, settings)
    return response
