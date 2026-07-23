"""Load the TCG catalog into tcg_cards from the committed fixture.

This is the standard way to populate the card catalog in any environment
(teammate dev, CI, prod) — it reads data/tcg_cards.jsonl.gz from the repo, so it
works offline and doesn't depend on the pokemontcg.io API being up.

    docker compose exec api python -m app.scripts.load_tcg_cards

Idempotent: skips if tcg_cards already has rows. Pass --force to truncate and
reload (e.g. after refreshing the fixture with build_tcg_fixture.py).
"""
from __future__ import annotations

import gzip
import json
import sys
from pathlib import Path
from typing import Any

import sqlalchemy as sa

from app.db.session import SessionLocal
from app.models.tcg_card import TcgCard

_FIXTURE = Path(__file__).resolve().parent / "data" / "tcg_cards.jsonl.gz"
_BATCH = 2000


def _read_fixture() -> list[dict[str, Any]]:
    if not _FIXTURE.exists():
        raise FileNotFoundError(
            f"Catalog fixture not found at {_FIXTURE}. "
            "Regenerate it with app.scripts.build_tcg_fixture."
        )
    with gzip.open(_FIXTURE, "rt", encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def load(force: bool = False) -> None:
    db = SessionLocal()
    try:
        existing: int = db.scalar(sa.select(sa.func.count(TcgCard.id))) or 0
        if existing > 0 and not force:
            print(f"tcg_cards already has {existing} rows — skipping. Pass --force to reload.")
            return
        if force and existing > 0:
            print(f"--force: truncating {existing} existing rows...")
            db.execute(sa.text("TRUNCATE TABLE tcg_cards"))
            db.commit()

        rows = _read_fixture()
        for start in range(0, len(rows), _BATCH):
            db.execute(sa.insert(TcgCard), rows[start : start + _BATCH])
            db.commit()

        total: int = db.scalar(sa.select(sa.func.count(TcgCard.id))) or 0
        print(f"Done — loaded {len(rows)} cards, tcg_cards now has {total} rows.")
    finally:
        db.close()


if __name__ == "__main__":
    load(force="--force" in sys.argv)
