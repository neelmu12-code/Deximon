from fastapi import UploadFile
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.routes import scanner as scanner_routes


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


def test_scan_proxy_forwards_file(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(scanner_routes, "_forward_to_scanner", fake_forward_to_scanner)

    response = client.post(
        "/scan",
        files={"file": ("charizard.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["endpoint"] == "/scan"
