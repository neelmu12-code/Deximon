import json
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.tcg import TcgCard, best_local_candidate, load_catalog_from_path, top_catalog_candidates


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
    assert len(body["candidates"]) >= 1
    assert body["candidates"][0]["name"] == "Pikachu"
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


def test_loads_pokemon_tcg_data_catalog_shape(tmp_path: Path) -> None:
    cards_dir = tmp_path / "cards" / "en"
    cards_dir.mkdir(parents=True)
    (cards_dir / "base1.json").write_text(
        json.dumps(
            [
                {
                    "id": "base1-4",
                    "name": "Charizard",
                    "set": {"id": "base1", "name": "Base Set"},
                    "number": "4",
                    "rarity": "Rare Holo",
                    "images": {"small": "https://images.pokemontcg.io/base1/4.png"},
                },
                {
                    "id": "base1-10",
                    "name": "Mewtwo",
                    "set": {"id": "base1", "name": "Base Set"},
                    "number": "10",
                    "rarity": "Rare Holo",
                    "images": {"small": "https://images.pokemontcg.io/base1/10.png"},
                },
            ]
        ),
        encoding="utf-8",
    )

    catalog = load_catalog_from_path(str(tmp_path))
    candidates = top_catalog_candidates("charzard base set 4", catalog)

    assert len(catalog) == 2
    assert candidates[0].name == "Charizard"
    assert candidates[0].image_url == "https://images.pokemontcg.io/base1/4.png"


def test_catalog_match_prefers_title_line_over_noisy_text() -> None:
    catalog = [
        TcgCard(
            id="base1-4",
            name="Charizard",
            set_name="Base Set",
            set_code="base1",
            number="4",
            rarity="Rare Holo",
            image_url=None,
        ),
        TcgCard(
            id="base1-10",
            name="Mewtwo",
            set_name="Base Set",
            set_code="base1",
            number="10",
            rarity="Rare Holo",
            image_url=None,
        ),
    ]

    candidates = top_catalog_candidates(
        "Charizard 120 HP\nEnergy Burn\nPsychic Mewtwo damage text",
        catalog,
    )

    assert candidates[0].id == "base1-4"


def test_catalog_match_uses_card_number_to_disambiguate() -> None:
    catalog = [
        TcgCard(
            id="base1-4",
            name="Charizard",
            set_name="Base Set",
            set_code="base1",
            number="4",
            rarity="Rare Holo",
            image_url=None,
        ),
        TcgCard(
            id="pgo-10",
            name="Charizard",
            set_name="Pokemon GO",
            set_code="pgo",
            number="10",
            rarity="Rare Holo",
            image_url=None,
        ),
    ]

    candidates = top_catalog_candidates("Charizard 4/102", catalog)

    assert candidates[0].id == "base1-4"
