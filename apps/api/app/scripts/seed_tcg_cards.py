"""
Download all Pokémon TCG cards from pokemontcg.io and insert into tcg_cards.

Run once after applying the 0004 migration:

    docker compose exec api python -m app.scripts.seed_tcg_cards

Pass --force to truncate and re-seed an existing table:

    docker compose exec api python -m app.scripts.seed_tcg_cards --force
"""
from __future__ import annotations

import sys
import time

import httpx
import sqlalchemy as sa

from app.db.session import SessionLocal
from app.models.tcg_card import TcgCard

_BASE_URL = "https://api.pokemontcg.io/v2/cards"
_PAGE_SIZE = 250
_BATCH_COMMIT = 1000  # commit every N cards


def _fetch_page(client: httpx.Client, page: int) -> dict[str, object]:
    for attempt in range(3):
        try:
            resp = client.get(
                _BASE_URL,
                params={"pageSize": _PAGE_SIZE, "page": page, "select": "id,name,set,number,rarity,types,images"},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()  # type: ignore[no-any-return]
        except httpx.HTTPError as exc:
            if attempt == 2:
                raise
            print(f"  retry {attempt + 1}/3 after error: {exc}")
            time.sleep(2**attempt)
    return {}


def seed(force: bool = False, max_cards: int | None = None) -> None:
    db = SessionLocal()
    try:
        existing: int = db.scalar(sa.select(sa.func.count(TcgCard.id))) or 0
        if existing > 0 and not force:
            print(f"tcg_cards already has {existing} rows — skipping. Pass --force to reseed.")
            return
        if force and existing > 0:
            print(f"--force: truncating {existing} existing rows...")
            db.execute(sa.text("TRUNCATE TABLE tcg_cards"))
            db.commit()

        print("Fetching card catalog from pokemontcg.io...")
        with httpx.Client() as client:
            page = 1
            total: int | None = None
            inserted = 0

            while True:
                data = _fetch_page(client, page)
                cards: list[dict[str, object]] = data.get("data", [])  # type: ignore[assignment]

                if total is None:
                    raw_total = data.get("totalCount")
                    total = int(raw_total) if isinstance(raw_total, int) else 0
                    print(f"Total cards reported by API: {total}")

                if not cards:
                    break

                rows = []
                for card in cards:
                    images: dict[str, str] = card.get("images", {})  # type: ignore[assignment]
                    card_set: dict[str, str] = card.get("set", {})  # type: ignore[assignment]
                    type_list: list[str] = card.get("types", [])  # type: ignore[assignment]
                    rows.append({
                        "id": str(card["id"]),
                        "name": str(card["name"]),
                        "set_code": card_set.get("id", ""),
                        "set_name": card_set.get("name", ""),
                        "number": str(card.get("number", "")),
                        "rarity": str(card["rarity"]) if card.get("rarity") else None,
                        "types": ",".join(type_list) if type_list else None,
                        "image_small": images.get("small"),
                        "image_large": images.get("large"),
                    })

                db.execute(sa.insert(TcgCard), rows)
                inserted += len(rows)

                if inserted % _BATCH_COMMIT < _PAGE_SIZE:
                    db.commit()
                    print(f"  {inserted}/{total or '?'} cards inserted")

                if (total and inserted >= total) or (max_cards and inserted >= max_cards):
                    break
                page += 1
                time.sleep(0.05)  # stay well under rate limit

        db.commit()
        print(f"Done — {inserted} cards in tcg_cards.")
    finally:
        db.close()


if __name__ == "__main__":
    _max = None
    for _arg in sys.argv[1:]:
        if _arg.startswith("--max="):
            _max = int(_arg.split("=", 1)[1])
    seed(force="--force" in sys.argv, max_cards=_max)
