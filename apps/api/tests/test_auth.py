from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models.user import User
from app.routes.auth import _google_user


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


def test_google_login_requires_configuration(client: TestClient) -> None:
    response = client.get("/auth/google/login")
    assert response.status_code == 503


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
