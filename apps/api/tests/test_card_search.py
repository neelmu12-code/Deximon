from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.models.tcg_card import TcgCard
from app.routes import cards as cards_route
from app.schemas.cards import CardSearchResult


def test_card_search_uses_seeded_database(
    client: TestClient,
    session_factory: sessionmaker[Session],
) -> None:
    with session_factory() as db:
        db.add(
            TcgCard(
                id="base1-4",
                name="Charizard",
                set_code="base1",
                set_name="Base Set",
                number="4",
                rarity="Rare Holo",
                image_small="https://images.pokemontcg.io/base1/4.png",
            )
        )
        db.commit()

    response = client.get("/cards/search?q=chari")

    assert response.status_code == 200
    assert response.json()[0] == {
        "id": "base1-4",
        "name": "Charizard",
        "set": "base1",
        "set_name": "Base Set",
        "num": "4",
        "rarity": "Rare Holo",
        "image": "https://images.pokemontcg.io/base1/4.png",
    }


def test_card_search_falls_back_to_pokemon_tcg_api_when_database_is_empty(
    client: TestClient,
    monkeypatch,
) -> None:
    def fake_pokemon_tcg_search(q: str, limit: int) -> list[CardSearchResult]:
        assert q == "chari"
        assert limit == 24
        return [
            CardSearchResult(
                id="base1-4",
                name="Charizard",
                set="base1",
                set_name="Base Set",
                num="4",
                rarity="Rare Holo",
                image="https://images.pokemontcg.io/base1/4.png",
            )
        ]

    monkeypatch.setattr(cards_route, "_pokemon_tcg_search", fake_pokemon_tcg_search)

    response = client.get("/cards/search?q=chari")

    assert response.status_code == 200
    assert response.json()[0]["name"] == "Charizard"
