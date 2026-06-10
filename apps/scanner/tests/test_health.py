from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.tcg import best_local_candidate


def test_healthz() -> None:
    client = TestClient(app)
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_scan_mock_returns_candidate() -> None:
    client = TestClient(app)
    image = BytesIO()
    Image.new("RGB", (20, 20), "yellow").save(image, format="PNG")

    response = client.post(
        "/scan/mock",
        files={"file": ("pikachu.png", image.getvalue(), "image/png")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "local_mock"
    assert body["candidate"]["name"] == "Pikachu"
    assert body["image"]["width"] == 20


def test_scan_mock_rejects_non_image() -> None:
    client = TestClient(app)
    response = client.post(
        "/scan/mock",
        files={"file": ("notes.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 415


def test_scan_requires_explicit_aws_configuration() -> None:
    client = TestClient(app)
    image = BytesIO()
    Image.new("RGB", (20, 20), "yellow").save(image, format="PNG")

    response = client.post(
        "/scan",
        files={"file": ("pikachu.png", image.getvalue(), "image/png")},
    )

    assert response.status_code == 503


def test_fuzzy_match_handles_card_names() -> None:
    candidate = best_local_candidate("charzard base set")
    assert candidate.name == "Charizard"
