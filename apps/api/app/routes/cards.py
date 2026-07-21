import re
from typing import Annotated, cast

import httpx
import sqlalchemy as sa
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.tcg_card import TcgCard
from app.schemas.cards import CardSearchResult

router = APIRouter(prefix="/cards", tags=["cards"])
DbSession = Annotated[Session, Depends(get_db)]
_POKEMON_TCG_API_URL = "https://api.pokemontcg.io/v2/cards"


@router.get("/search", response_model=list[CardSearchResult])
def search_cards(
    q: Annotated[str, Query(min_length=1, max_length=100)],
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=50)] = 24,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[CardSearchResult]:
    rows = db.scalars(
        sa.select(TcgCard)
        .where(
            sa.or_(
                TcgCard.name.ilike(f"%{q}%"),
                TcgCard.set_code.ilike(f"%{q}%"),
                TcgCard.number.ilike(f"%{q}%"),
            )
        )
        .order_by(
            # Prefix matches first, then alphabetical. id keeps paging stable.
            sa.case((TcgCard.name.ilike(f"{q}%"), 0), else_=1),
            TcgCard.name,
            TcgCard.id,
        )
        .offset(offset)
        .limit(limit)
    ).all()

    if rows:
        return [_card_result_from_model(row) for row in rows]

    # Only fall back to the public API on the first page.
    if offset == 0:
        return _pokemon_tcg_search(q, limit)
    return []


def _card_result_from_model(row: TcgCard) -> CardSearchResult:
    return CardSearchResult(
        id=row.id,
        name=row.name,
        set=row.set_code,
        set_name=row.set_name,
        num=row.number,
        rarity=row.rarity or "",
        image=row.image_small or row.image_large or "",
    )


def _pokemon_tcg_search(q: str, limit: int) -> list[CardSearchResult]:
    terms = re.findall(r"[A-Za-z0-9-]+", q.lower())
    if not terms:
        return []

    # The local DB is the preferred source. This fallback keeps manual add usable
    # on fresh environments before the catalog seed script has run.
    api_query = " ".join(f"name:*{term}*" for term in terms[:4])
    try:
        with httpx.Client(timeout=8) as client:
            response = client.get(
                _POKEMON_TCG_API_URL,
                params={
                    "q": api_query,
                    "pageSize": str(limit),
                    "select": "id,name,set,number,rarity,images",
                },
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        return []

    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, list):
        return []

    results: list[CardSearchResult] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        card = cast("dict[str, object]", item)
        result = _card_result_from_api(card)
        if result:
            results.append(result)
    return results


def _card_result_from_api(card: dict[str, object]) -> CardSearchResult | None:
    card_id = _required_str(card.get("id"))
    name = _required_str(card.get("name"))
    number = _required_str(card.get("number"))
    if not card_id or not name:
        return None

    card_set = card.get("set")
    set_data = cast("dict[str, object]", card_set) if isinstance(card_set, dict) else {}
    images = card.get("images")
    image_data = cast("dict[str, object]", images) if isinstance(images, dict) else {}
    return CardSearchResult(
        id=card_id,
        name=name,
        set=_required_str(set_data.get("id")),
        set_name=_required_str(set_data.get("name")),
        num=number,
        rarity=_required_str(card.get("rarity")),
        image=_required_str(image_data.get("small")) or _required_str(image_data.get("large")),
    )


def _required_str(value: object) -> str:
    return str(value or "").strip()
