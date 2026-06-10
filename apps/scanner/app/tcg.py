from collections.abc import Iterable
from dataclasses import dataclass

import httpx
from rapidfuzz import fuzz, process

from app.config import Settings
from app.schemas import ScanCandidate


@dataclass(frozen=True)
class TcgCard:
    id: str
    name: str
    set_name: str
    set_code: str
    number: str
    rarity: str | None
    image_url: str | None

    @property
    def search_text(self) -> str:
        return f"{self.name} {self.set_name} {self.set_code} {self.number}"


MOCK_CARDS = [
    TcgCard(
        id="base1-58",
        name="Pikachu",
        set_name="Base Set",
        set_code="base1",
        number="58",
        rarity="Common",
        image_url="https://images.pokemontcg.io/base1/58.png",
    ),
    TcgCard(
        id="base1-4",
        name="Charizard",
        set_name="Base Set",
        set_code="base1",
        number="4",
        rarity="Rare Holo",
        image_url="https://images.pokemontcg.io/base1/4.png",
    ),
    TcgCard(
        id="base1-10",
        name="Mewtwo",
        set_name="Base Set",
        set_code="base1",
        number="10",
        rarity="Rare Holo",
        image_url="https://images.pokemontcg.io/base1/10.png",
    ),
    TcgCard(
        id="base1-2",
        name="Blastoise",
        set_name="Base Set",
        set_code="base1",
        number="2",
        rarity="Rare Holo",
        image_url="https://images.pokemontcg.io/base1/2.png",
    ),
]


def fuzzy_match(query: str, cards: Iterable[TcgCard]) -> tuple[TcgCard, float]:
    candidates = list(cards)
    if not candidates:
        raise ValueError("No card candidates are available.")

    choices = {card.search_text: card for card in candidates}
    match = process.extractOne(query, choices.keys(), scorer=fuzz.WRatio)
    if match is None:
        return candidates[0], 0.25
    text, score, _ = match
    return choices[text], max(0.25, min(score / 100, 0.99))


def card_to_candidate(card: TcgCard, confidence: float) -> ScanCandidate:
    return ScanCandidate(
        id=card.id,
        name=card.name,
        set_name=card.set_name,
        set_code=card.set_code,
        number=card.number,
        rarity=card.rarity,
        image_url=card.image_url,
        confidence=round(confidence, 2),
    )


def lookup_cards(query: str, settings: Settings, limit: int = 10) -> list[TcgCard]:
    params = {
        "q": f'name:"{query}*"',
        "pageSize": str(limit),
        "select": "id,name,set,number,rarity,images",
    }
    headers = {"X-Api-Key": settings.pokemon_tcg_api_key} if settings.pokemon_tcg_api_key else {}
    with httpx.Client(timeout=8) as client:
        response = client.get(f"{settings.pokemon_tcg_api_url.rstrip('/')}/cards", params=params, headers=headers)
        response.raise_for_status()
        payload = response.json()

    cards: list[TcgCard] = []
    for item in payload.get("data", []):
        card_set = item.get("set") or {}
        images = item.get("images") or {}
        cards.append(
            TcgCard(
                id=str(item.get("id", "")),
                name=str(item.get("name", "")),
                set_name=str(card_set.get("name", "")),
                set_code=str(card_set.get("id", "")),
                number=str(item.get("number", "")),
                rarity=item.get("rarity"),
                image_url=images.get("small") or images.get("large"),
            )
        )
    return [card for card in cards if card.id and card.name]


def best_local_candidate(query: str) -> ScanCandidate:
    card, confidence = fuzzy_match(query, MOCK_CARDS)
    return card_to_candidate(card, confidence)
