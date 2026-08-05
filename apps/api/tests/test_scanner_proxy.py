from datetime import UTC, datetime, timedelta

import pytest
from fastapi import UploadFile
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings
from app.main import app
from app.routes import scanner as scanner_routes
from app.services.limits import DailyScanLimitError, reserve_daily_aws_scan


async def fake_forward_to_scanner(
    endpoint: str,
    file: UploadFile,
    settings: Settings,
    data: dict[str, str] | None = None,
) -> dict[str, object]:
    content = await file.read()
    return {
        "endpoint": endpoint,
        "filename": file.filename,
        "content_type": file.content_type,
        "bytes": len(content),
        "scanner_url": settings.scanner_url,
        "data": data,
    }


def test_scan_mock_proxy_forwards_file(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(scanner_routes, "_forward_to_scanner", fake_forward_to_scanner)

    response = client.post(
        "/scan/mock",
        files={"file": ("pikachu.png", b"fake-image", "image/png")},
        data={"q": "Pikachu"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "endpoint": "/scan/mock",
        "filename": "pikachu.png",
        "content_type": "image/png",
        "bytes": 10,
        "scanner_url": "http://scanner:8001",
        "data": {"q": "Pikachu"},
    }


def register_user(client: TestClient, suffix: str) -> str:
    response = client.post(
        "/auth/register",
        json={
            "email": f"{suffix}@example.com",
            "username": suffix,
            "display_name": suffix.title(),
            "password": "Starmie123!",
        },
    )
    assert response.status_code == 201
    return str(response.json()["access_token"])


def test_scan_proxy_requires_authentication(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(scanner_routes, "_forward_to_scanner", fake_forward_to_scanner)

    response = client.post(
        "/scan",
        files={"file": ("charizard.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 401


def test_scan_proxy_forwards_file(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(scanner_routes, "_forward_to_scanner", fake_forward_to_scanner)
    token = register_user(client, "ash")
    client.cookies.clear()

    response = client.post(
        "/scan",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("charizard.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["endpoint"] == "/scan"
    assert response.headers["X-RateLimit-Limit"] == "10"
    assert response.headers["X-RateLimit-Remaining"] == "9"


def test_real_scan_limit_is_shared_by_all_users(client: TestClient, monkeypatch) -> None:
    forwarded_requests = 0

    async def counting_forward(
        endpoint: str,
        file: UploadFile,
        settings: Settings,
        data: dict[str, str] | None = None,
    ) -> dict[str, object]:
        nonlocal forwarded_requests
        forwarded_requests += 1
        return await fake_forward_to_scanner(endpoint, file, settings, data)

    monkeypatch.setattr(scanner_routes, "_forward_to_scanner", counting_forward)
    settings = get_settings().model_copy(update={"daily_aws_scan_limit": 10})
    app.dependency_overrides[get_settings] = lambda: settings
    ash_token = register_user(client, "ash")
    misty_token = register_user(client, "misty")
    client.cookies.clear()

    for index in range(10):
        token = ash_token if index % 2 == 0 else misty_token
        response = client.post(
            "/scan",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": (f"card-{index}.jpg", b"fake-image", "image/jpeg")},
        )
        assert response.status_code == 200
        assert response.headers["X-RateLimit-Remaining"] == str(9 - index)

    blocked = client.post(
        "/scan",
        headers={"Authorization": f"Bearer {ash_token}"},
        files={"file": ("blocked.jpg", b"fake-image", "image/jpeg")},
    )

    assert blocked.status_code == 429
    assert blocked.headers["X-RateLimit-Limit"] == "10"
    assert blocked.headers["X-RateLimit-Remaining"] == "0"
    assert int(blocked.headers["Retry-After"]) > 0
    assert forwarded_requests == 10


def test_daily_scan_limit_resets_on_next_utc_day(
    session_factory: sessionmaker[Session],
) -> None:
    first_day = datetime(2026, 8, 5, 12, tzinfo=UTC)
    with session_factory() as db:
        first = reserve_daily_aws_scan(db, 1, now=first_day)
        db.commit()
        assert first.remaining == 0

        with pytest.raises(DailyScanLimitError):
            reserve_daily_aws_scan(db, 1, now=first_day + timedelta(hours=1))
        db.rollback()

        next_day = reserve_daily_aws_scan(db, 1, now=first_day + timedelta(days=1))
        db.commit()
        assert next_day.used == 1
        assert next_day.remaining == 0
