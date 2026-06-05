from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from fastapi.responses import RedirectResponse
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings
from app.core.security import hash_reset_token
from app.main import app
from app.models.user import PasswordResetToken, User
from app.routes import auth as auth_routes
from app.routes.auth import _google_user

FORGOT_PASSWORD_MESSAGE = "If an account with that email exists, password reset instructions have been sent."
RESET_PASSWORD_MESSAGE = "Password has been reset successfully."


def registration_payload() -> dict[str, str]:
    return {
        "email": "misty@example.com",
        "username": "misty",
        "display_name": "Misty",
        "password": "Starmie123!",
    }


def register(client: TestClient) -> dict[str, object]:
    response = client.post("/auth/register", json=registration_payload())
    assert response.status_code == 201
    return response.json()


def oauth_test_settings(**overrides: object) -> SimpleNamespace:
    values: dict[str, object] = {
        "google_redirect_uri": "http://localhost:8000/api/auth/google/callback",
        "frontend_auth_success_redirect_url": "http://localhost:5173",
        "frontend_auth_error_redirect_url": "http://localhost:5173/login?error=oauth_failed",
        "auth_cookie_name": "access_token",
        "auth_cookie_secure": False,
        "access_token_expire_minutes": 60,
        "jwt_secret_key": "test-only-jwt-secret-key-that-is-long-enough",
        "jwt_algorithm": "HS256",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def request_password_reset(client: TestClient, monkeypatch, raw_token: str) -> None:
    monkeypatch.setattr(auth_routes, "generate_reset_token", lambda: raw_token)
    response = client.post("/api/auth/forgot-password", json={"email": "misty@example.com"})
    assert response.status_code == 200
    assert response.json() == {"message": FORGOT_PASSWORD_MESSAGE}
    assert raw_token not in response.text


def test_register_success_hashes_password_and_returns_token(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    body = register(client)
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "misty@example.com"
    assert client.cookies.get("access_token")

    with session_factory() as db:
        user = db.scalar(select(User).where(User.email == "misty@example.com"))
        assert user is not None
        assert user.password_hash != registration_payload()["password"]
        assert user.profile.binder_public is True


def test_duplicate_email_is_rejected_case_insensitively(client: TestClient) -> None:
    register(client)
    duplicate = registration_payload() | {"email": "MISTY@example.com", "username": "cerulean"}
    response = client.post("/auth/register", json=duplicate)
    assert response.status_code == 409
    assert response.json()["detail"] == "Email is already registered"


def test_login_success_returns_access_token(client: TestClient) -> None:
    register(client)
    client.cookies.clear()
    response = client.post(
        "/auth/login",
        json={"email": "misty@example.com", "password": "Starmie123!"},
    )
    assert response.status_code == 200
    assert response.json()["access_token"]
    assert client.cookies.get("access_token")
    assert client.get("/auth/me").status_code == 200


def test_logout_clears_browser_authentication(client: TestClient) -> None:
    register(client)
    assert client.post("/auth/logout").status_code == 204
    assert client.get("/auth/me").status_code == 401


def test_login_wrong_password_is_rejected(client: TestClient) -> None:
    register(client)
    response = client.post(
        "/auth/login",
        json={"email": "misty@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_me_accepts_bearer_token(client: TestClient) -> None:
    token = register(client)["access_token"]
    client.cookies.clear()
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "misty"


def test_me_rejects_missing_and_invalid_tokens(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_profile_update_requires_authentication_and_updates_current_user(client: TestClient) -> None:
    assert client.patch("/profiles/me", json={"bio": "Gym leader"}).status_code == 401
    register(client)
    response = client.patch(
        "/profiles/me",
        json={"display_name": "Misty Waterflower", "bio": "Cerulean Gym Leader"},
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "Misty Waterflower"
    assert response.json()["bio"] == "Cerulean Gym Leader"
    assert client.get("/profiles/misty").json()["bio"] == "Cerulean Gym Leader"


def test_privacy_update_requires_authentication(client: TestClient) -> None:
    register(client)
    response = client.patch("/profiles/me/privacy", json={"binder_visibility": "private"})
    assert response.status_code == 200
    assert response.json()["binder_visibility"] == "private"


def test_forgot_password_returns_generic_success_for_existing_email(
    client: TestClient, session_factory: sessionmaker[Session], monkeypatch
) -> None:
    register(client)
    raw_token = "existing-email-reset-token"

    request_password_reset(client, monkeypatch, raw_token)

    with session_factory() as db:
        reset_token = db.scalar(select(PasswordResetToken))
        assert reset_token is not None
        assert reset_token.token_hash == hash_reset_token(raw_token, get_settings())
        assert reset_token.token_hash != raw_token
        assert reset_token.used_at is None
        assert reset_token.revoked_at is None


def test_forgot_password_returns_generic_success_for_nonexistent_email(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    response = client.post("/api/auth/forgot-password", json={"email": "missing@example.com"})

    assert response.status_code == 200
    assert response.json() == {"message": FORGOT_PASSWORD_MESSAGE}
    with session_factory() as db:
        assert db.scalar(select(PasswordResetToken)) is None


def test_reset_password_succeeds_and_login_uses_new_password(
    client: TestClient, session_factory: sessionmaker[Session], monkeypatch
) -> None:
    register(client)
    raw_token = "valid-reset-token-for-misty"
    request_password_reset(client, monkeypatch, raw_token)

    response = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "NewStarmie123!"},
    )

    assert response.status_code == 200
    assert response.json() == {"message": RESET_PASSWORD_MESSAGE}
    with session_factory() as db:
        reset_token = db.scalar(select(PasswordResetToken))
        assert reset_token is not None
        assert reset_token.used_at is not None

    old_login = client.post(
        "/auth/login",
        json={"email": "misty@example.com", "password": "Starmie123!"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/auth/login",
        json={"email": "misty@example.com", "password": "NewStarmie123!"},
    )
    assert new_login.status_code == 200


def test_reset_password_fails_with_invalid_token(client: TestClient) -> None:
    response = client.post(
        "/api/auth/reset-password",
        json={"token": "invalid-reset-token-value", "new_password": "NewStarmie123!"},
    )

    assert response.status_code == 400


def test_reset_password_fails_with_expired_token(
    client: TestClient, session_factory: sessionmaker[Session], monkeypatch
) -> None:
    register(client)
    raw_token = "expired-reset-token-for-misty"
    request_password_reset(client, monkeypatch, raw_token)
    with session_factory() as db:
        reset_token = db.scalar(select(PasswordResetToken))
        assert reset_token is not None
        reset_token.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        db.commit()

    response = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "NewStarmie123!"},
    )

    assert response.status_code == 400


def test_reset_password_fails_if_token_is_reused(client: TestClient, monkeypatch) -> None:
    register(client)
    raw_token = "single-use-reset-token-for-misty"
    request_password_reset(client, monkeypatch, raw_token)
    first = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "NewStarmie123!"},
    )
    assert first.status_code == 200

    second = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "AnotherStarmie123!"},
    )

    assert second.status_code == 400


def test_google_login_requires_configuration(client: TestClient) -> None:
    assert client.get("/auth/google/login").status_code == 503
    assert client.get("/api/auth/google/login").status_code == 503


def test_frontend_url_drives_default_oauth_redirects() -> None:
    settings = Settings(
        JWT_SECRET_KEY="test-only-jwt-secret-key-that-is-long-enough",
        FRONTEND_ORIGIN="http://localhost:3000",
        FRONTEND_URL="http://localhost:5173",
    )

    assert settings.google_redirect_uri == "http://localhost:8000/api/auth/google/callback"
    assert settings.frontend_auth_success_redirect_url == "http://localhost:5173"
    assert settings.frontend_auth_error_redirect_url == "http://localhost:5173/login?error=oauth_failed"
    assert "http://localhost:5173" in settings.cors_origin_list


def test_api_google_login_uses_api_callback_uri(client: TestClient, monkeypatch) -> None:
    seen: dict[str, str] = {}

    class FakeGoogle:
        async def authorize_redirect(self, _request, redirect_uri: str) -> RedirectResponse:
            seen["redirect_uri"] = redirect_uri
            return RedirectResponse(
                "https://accounts.google.com/o/oauth2/v2/auth?scope=openid%20email%20profile&state=test-state",
                status_code=302,
            )

    monkeypatch.setattr(auth_routes, "_get_google_client", lambda _settings: FakeGoogle())
    app.dependency_overrides[get_settings] = lambda: oauth_test_settings()

    response = client.get("/api/auth/google/login", follow_redirects=False)

    assert response.status_code == 302
    assert seen["redirect_uri"] == "http://localhost:8000/api/auth/google/callback"
    assert "accounts.google.com" in response.headers["location"]


def test_api_google_callback_rejects_missing_state(client: TestClient, monkeypatch) -> None:
    def fail_if_google_client_is_requested(_settings):
        raise AssertionError("Missing OAuth state should fail before token exchange")

    monkeypatch.setattr(auth_routes, "_get_google_client", fail_if_google_client_is_requested)

    response = client.get("/api/auth/google/callback?code=abc", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"] == "http://localhost:3000/login?error=oauth_failed"


def test_api_google_callback_creates_user_sets_cookie_and_redirects(
    client: TestClient, session_factory: sessionmaker[Session], monkeypatch
) -> None:
    class FakeGoogle:
        async def authorize_access_token(self, request) -> dict[str, dict[str, object]]:
            assert request.query_params["state"] == "state-123"
            return {
                "userinfo": {
                    "email": "brock@example.com",
                    "email_verified": True,
                    "sub": "google-subject-brock",
                    "name": "Brock",
                }
            }

    monkeypatch.setattr(auth_routes, "_get_google_client", lambda _settings: FakeGoogle())
    app.dependency_overrides[get_settings] = lambda: oauth_test_settings()

    response = client.get(
        "/api/auth/google/callback?code=code-123&state=state-123",
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"] == "http://localhost:5173"
    assert client.cookies.get("access_token")

    with session_factory() as db:
        user = db.scalar(select(User).where(User.email == "brock@example.com"))
        assert user is not None
        assert user.google_subject == "google-subject-brock"
        assert user.password_hash is None


def test_google_user_helper_links_existing_verified_email(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    register(client)
    with session_factory() as db:
        user = _google_user(
            db,
            {
                "email": "misty@example.com",
                "email_verified": True,
                "sub": "google-subject-1",
                "name": "Misty",
            },
        )
        db.commit()
        assert user.email == "misty@example.com"
        assert user.google_subject == "google-subject-1"
