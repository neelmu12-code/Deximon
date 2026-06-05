import hmac
import secrets
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any, cast

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import Settings
from app.models.user import User

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, hashed_password: str | None) -> bool:
    if not hashed_password:
        return False
    try:
        return password_context.verify(password, hashed_password)
    except ValueError:
        return False


def generate_reset_token() -> str:
    return secrets.token_urlsafe(48)


def hash_reset_token(token: str, settings: Settings) -> str:
    return hmac.new(
        settings.jwt_secret_key.encode("utf-8"),
        token.encode("utf-8"),
        sha256,
    ).hexdigest()


def create_access_token(user: User, settings: Settings) -> str:
    issued_at = datetime.now(UTC)
    expires_at = issued_at + timedelta(minutes=settings.access_token_expire_minutes)
    claims = {
        "sub": str(user.id),
        "email": user.email,
        "iat": issued_at,
        "exp": expires_at,
    }
    return cast(str, jwt.encode(claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm))


def decode_access_token(token: str, settings: Settings) -> dict[str, Any]:
    try:
        return cast(
            dict[str, Any],
            jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            ),
        )
    except JWTError as exc:
        raise ValueError("Invalid access token") from exc
