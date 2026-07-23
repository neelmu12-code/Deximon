"""Build the committed TCG catalog fixture from a pokemon-tcg-data checkout.

Maintainer tool. The fixture it writes (data/tcg_cards.jsonl.gz) is what
load_tcg_cards.py reads to seed any environment offline, so nobody has to hit
the flaky pokemontcg.io API. Regenerate it when you want to refresh the catalog:

    git clone --depth 1 https://github.com/PokemonTCG/pokemon-tcg-data
    python -m app.scripts.build_tcg_fixture --src ./pokemon-tcg-data

The source repo stores one JSON file per set under cards/en/, with the set name
living separately in sets/en.json. We flatten both into the columns tcg_cards
actually uses.
"""
from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path
from typing import Any

# Column max lengths from app/models/tcg_card.py — used to warn if the upstream
# data ever outgrows the schema rather than silently failing at insert time.
_MAX_LEN = {
    "id": 30,
    "name": 120,
    "set_code": 20,
    "set_name": 80,
    "number": 20,
    "rarity": 50,
    "types": 100,
    "image_small": 300,
    "image_large": 300,
}

_DEFAULT_OUT = Path(__file__).resolve().parent / "data" / "tcg_cards.jsonl.gz"


def _set_names(src: Path) -> dict[str, str]:
    sets = json.loads((src / "sets" / "en.json").read_text(encoding="utf-8"))
    return {str(entry["id"]): str(entry.get("name", "")) for entry in sets}


def _rows(src: Path) -> list[dict[str, Any]]:
    set_names = _set_names(src)
    rows: list[dict[str, Any]] = []
    for card_file in sorted((src / "cards" / "en").glob("*.json")):
        set_code = card_file.stem
        set_name = set_names.get(set_code, set_code)
        for card in json.loads(card_file.read_text(encoding="utf-8")):
            images = card.get("images", {}) or {}
            types = card.get("types") or []
            rows.append(
                {
                    "id": str(card["id"]),
                    "name": str(card["name"]),
                    "set_code": set_code,
                    "set_name": set_name,
                    "number": str(card.get("number", "")),
                    "rarity": str(card["rarity"]) if card.get("rarity") else None,
                    "types": ",".join(types) if types else None,
                    "image_small": images.get("small"),
                    "image_large": images.get("large"),
                }
            )
    return rows


def _warn_overlong(rows: list[dict[str, Any]]) -> None:
    for column, limit in _MAX_LEN.items():
        worst = max((len(str(row[column])) for row in rows if row[column]), default=0)
        if worst > limit:
            print(f"  WARNING: '{column}' has a value of length {worst} > {limit}")


def build(src: Path, out: Path) -> None:
    rows = _rows(src)
    _warn_overlong(rows)
    out.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(out, "wt", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    size_mb = out.stat().st_size / (1024 * 1024)
    print(f"Wrote {len(rows)} cards to {out} ({size_mb:.2f} MB gzipped)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the TCG catalog fixture.")
    parser.add_argument("--src", required=True, type=Path, help="Path to a pokemon-tcg-data checkout")
    parser.add_argument("--out", type=Path, default=_DEFAULT_OUT, help="Output fixture path")
    args = parser.parse_args()
    build(args.src, args.out)


if __name__ == "__main__":
    main()
