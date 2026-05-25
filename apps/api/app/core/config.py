from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(
        default="postgresql+psycopg://deximon:deximon@localhost:5432/deximon",
        alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    jwt_secret_key: str = Field(
        validation_alias=AliasChoices("JWT_SECRET_KEY", "JWT_SECRET"),
    )
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=60,
        gt=0,
        validation_alias=AliasChoices("ACCESS_TOKEN_EXPIRE_MINUTES", "ACCESS_TOKEN_TTL_MINUTES"),
    )

    frontend_origin: str = Field(
        default="http://localhost:3000",
        validation_alias=AliasChoices("FRONTEND_ORIGIN", "API_CORS_ORIGINS"),
    )
    backend_base_url: str = Field(default="http://localhost:8000", alias="BACKEND_BASE_URL")

    google_client_id: str = Field(
        default="",
        validation_alias=AliasChoices("GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID"),
    )
    google_client_secret: str = Field(
        default="",
        validation_alias=AliasChoices("GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_CLIENT_SECRET"),
    )
    google_redirect_uri: str = Field(
        default="http://localhost:8000/auth/google/callback", alias="GOOGLE_REDIRECT_URI"
    )
    frontend_auth_success_url: str = Field(
        default="http://localhost:3000/auth/success", alias="FRONTEND_AUTH_SUCCESS_URL"
    )
    frontend_auth_error_url: str = Field(
        default="http://localhost:3000/login?error=oauth_failed", alias="FRONTEND_AUTH_ERROR_URL"
    )

    auth_cookie_name: str = Field(default="access_token", alias="AUTH_COOKIE_NAME")
    auth_cookie_secure: bool = Field(default=False, alias="AUTH_COOKIE_SECURE")
    session_secret_key: str | None = Field(default=None, alias="SESSION_SECRET_KEY")

    @field_validator("jwt_algorithm")
    @classmethod
    def validate_jwt_algorithm(cls, value: str) -> str:
        if value.lower() == "none":
            raise ValueError("JWT_ALGORITHM must sign tokens")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]

    @property
    def google_oauth_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def oauth_session_secret(self) -> str:
        return self.session_secret_key or self.jwt_secret_key


@lru_cache
def get_settings() -> Settings:
    return Settings()
