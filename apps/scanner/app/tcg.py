import json
import re
from collections.abc import Iterable
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import cast

import httpx
from rapidfuzz import fuzz

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
    ocr_text: str = ""

    @property
    def search_text(self) -> str:
        return f"{self.name} {self.set_name} {self.set_code} {self.number} {self.ocr_text}"


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
        id="xy2-13",
        name="Charizard-EX",
        set_name="Flashfire",
        set_code="xy2",
        number="13",
        rarity="Rare Holo EX",
        image_url="https://images.pokemontcg.io/xy2/13.png",
    ),
    TcgCard(
        id="xy2-69",
        name="M Charizard-EX",
        set_name="Flashfire",
        set_code="xy2",
        number="69",
        rarity="Rare Holo EX",
        image_url="https://images.pokemontcg.io/xy2/69.png",
    ),
    TcgCard(
        id="pgo-10",
        name="Charizard",
        set_name="Pokemon GO",
        set_code="pgo",
        number="10",
        rarity="Rare Holo",
        image_url="https://images.pokemontcg.io/pgo/10.png",
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

_STOP_WORDS = {
    "ability",
    "attack",
    "basic",
    "card",
    "damage",
    "defending",
    "does",
    "during",
    "energy",
    "evolves",
    "from",
    "game",
    "holo",
    "hp",
    "illustrator",
    "into",
    "length",
    "no",
    "pokemon",
    "resistance",
    "retreat",
    "stage",
    "this",
    "weak",
    "weakness",
    "weight",
    "your",
}
_SPECIAL_NAME_TOKENS = {"ex", "gx", "v", "vmax", "vstar", "mega"}
_FORM_NAME_TOKENS = {"x", "y"}
_MEGA_ALIAS_RE = re.compile(r"\bm\s+[a-z][a-z]{2,}")
_KNOWN_NAME_HINTS = [
    "charizard",
    "pikachu",
    "mewtwo",
    "blastoise",
    "venusaur",
    "mew",
    "rayquaza",
    "lugia",
    "gengar",
    "dragonite",
    "gyarados",
    "eevee",
    "lucario",
    "greninja",
    "reshiram",
    "zekrom",
    "solgaleo",
    "lunala",
    "sylveon",
    "gardevoir",
    "umbreon",
    "espeon",
    "snorlax",
    "machamp",
    "alakazam",
    "scizor",
    "charmeleon",
    "charmander",
    "blaziken",
    "tyranitar",
    "scyther",
    "exeggcute",
]
_CONTEXT_STOP_WORDS = _STOP_WORDS | {
    "about",
    "after",
    "also",
    "attack",
    "attacks",
    "cards",
    "coin",
    "damage",
    "discard",
    "each",
    "effect",
    "effects",
    "flip",
    "more",
    "opponent",
    "opponents",
    "play",
    "rule",
    "special",
    "they",
    "them",
    "then",
    "these",
    "turn",
    "when",
    "with",
}


def fuzzy_match(query: str, cards: Iterable[TcgCard]) -> tuple[TcgCard, float]:
    candidates = top_fuzzy_matches(query, cards, limit=1)
    if not candidates:
        raise ValueError("No card candidates are available.")
    return candidates[0]


def top_fuzzy_matches(query: str, cards: Iterable[TcgCard], limit: int = 3) -> list[tuple[TcgCard, float]]:
    candidates = list(cards)
    if not candidates:
        return []

    query_variants = _query_variants(query)
    scored = [(card, _score_card(query_variants, card)) for card in candidates]
    scored.sort(key=lambda item: item[1], reverse=True)
    pool_size = max(limit * 8, 12)
    pool = [(card, score, index) for index, (card, score) in enumerate(scored[:pool_size]) if score > 0]
    matches = [
        (
            card,
            _calibrated_confidence(
                query_variants,
                card,
                score,
                scored[index + 1][1] if index + 1 < len(scored) else 0,
                index,
            ),
            score,
        )
        for card, score, index in pool
    ]
    if not matches and candidates:
        return [(candidates[0], 0.15)]
    matches.sort(key=lambda item: (item[1], item[2]), reverse=True)
    return [(card, confidence) for card, confidence, _score in matches[:limit]]


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
    queries = _catalog_queries(query)
    headers = {"X-Api-Key": settings.pokemon_tcg_api_key} if settings.pokemon_tcg_api_key else {}
    cards_by_id: dict[str, TcgCard] = {}

    with httpx.Client(timeout=8) as client:
        for catalog_query in queries:
            params = {
                "q": catalog_query,
                "pageSize": str(limit),
                "select": "id,name,set,number,rarity,images",
            }
            response = client.get(
                f"{settings.pokemon_tcg_api_url.rstrip('/')}/cards",
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            payload = response.json()

            for item in _iter_card_json(payload):
                card = _card_from_json(item)
                if card:
                    cards_by_id[card.id] = card
            if len(cards_by_id) >= limit:
                break

    return list(cards_by_id.values())


def load_catalog(settings: Settings) -> list[TcgCard]:
    return load_catalog_from_path(settings.pokemon_tcg_data_dir)


@lru_cache(maxsize=4)
def load_catalog_from_path(data_dir: str) -> list[TcgCard]:
    cards_dir = _resolve_cards_dir(Path(data_dir))
    if cards_dir is None:
        return []

    sets_by_id = _load_set_metadata(cards_dir)
    cards_by_id: dict[str, TcgCard] = {}
    for path in sorted(cards_dir.glob("*.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue

        fallback_set_code = path.stem
        fallback_set_name = sets_by_id.get(fallback_set_code, "")
        for item in _iter_card_json(payload):
            card = _card_from_json(
                item,
                fallback_set_code=fallback_set_code,
                fallback_set_name=fallback_set_name,
            )
            if card:
                cards_by_id[card.id] = card

    return list(cards_by_id.values())


def _resolve_cards_dir(data_dir: Path) -> Path | None:
    candidates = [data_dir, data_dir / "cards" / "en"]
    for candidate in candidates:
        if candidate.is_dir() and any(candidate.glob("*.json")):
            return candidate
    return None


def _iter_card_json(payload: object) -> Iterable[dict[str, object]]:
    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        data = payload.get("data")
        items = data if isinstance(data, list) else []
    else:
        items = []

    for item in items:
        if isinstance(item, dict):
            yield cast("dict[str, object]", item)


def _load_set_metadata(cards_dir: Path) -> dict[str, str]:
    repo_root = cards_dir.parent.parent if cards_dir.name == "en" else cards_dir.parent
    sets_file = repo_root / "sets" / "en.json"
    try:
        payload = json.loads(sets_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}

    sets_by_id: dict[str, str] = {}
    for item in _iter_card_json(payload):
        set_id = _required_str(item.get("id"))
        set_name = _required_str(item.get("name"))
        if set_id and set_name:
            sets_by_id[set_id] = set_name
    return sets_by_id


def _card_from_json(
    item: dict[str, object],
    *,
    fallback_set_code: str = "",
    fallback_set_name: str = "",
) -> TcgCard | None:
    card_id = _required_str(item.get("id"))
    name = _required_str(item.get("name"))
    if not card_id or not name:
        return None

    card_set = _as_dict(item.get("set"))
    set_name = _required_str(card_set.get("name")) or _required_str(item.get("set")) or fallback_set_name
    set_code = (
        _required_str(card_set.get("id"))
        or _required_str(item.get("setCode"))
        or _required_str(item.get("set_code"))
        or fallback_set_code
    )
    images = _as_dict(item.get("images"))
    return TcgCard(
        id=card_id,
        name=name,
        set_name=set_name,
        set_code=set_code,
        number=_required_str(item.get("number")),
        rarity=_optional_str(item.get("rarity")),
        image_url=_optional_str(images.get("small")) or _optional_str(images.get("large")),
        ocr_text=_catalog_ocr_text(item),
    )


def _as_dict(value: object) -> dict[str, object]:
    if isinstance(value, dict):
        return cast("dict[str, object]", value)
    return {}


def _required_str(value: object) -> str:
    return str(value or "").strip()


def _optional_str(value: object) -> str | None:
    text = _required_str(value)
    return text or None


def _catalog_ocr_text(item: dict[str, object]) -> str:
    parts = [
        _required_str(item.get("hp")),
        _required_str(item.get("evolvesFrom")),
        _required_str(item.get("artist")),
        _required_str(item.get("flavorText")),
    ]
    parts.extend(_string_items(item.get("types")))
    parts.extend(_string_items(item.get("subtypes")))
    parts.extend(_string_items(item.get("rules")))
    parts.extend(_named_text_items(item.get("attacks")))
    parts.extend(_named_text_items(item.get("abilities")))
    parts.extend(_named_text_items(item.get("weaknesses")))
    parts.extend(_named_text_items(item.get("resistances")))
    return " ".join(part for part in parts if part)


def _string_items(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [_required_str(item) for item in value if _required_str(item)]


def _named_text_items(value: object) -> list[str]:
    if not isinstance(value, list):
        return []

    parts: list[str] = []
    for item in value:
        if isinstance(item, str):
            parts.append(item)
            continue
        if not isinstance(item, dict):
            continue
        data = cast("dict[str, object]", item)
        for key in ("name", "text", "damage", "type", "value"):
            text = _required_str(data.get(key))
            if text:
                parts.append(text)
    return parts


def _catalog_queries(query: str) -> list[str]:
    normalized = re.sub(r"[^A-Za-z0-9 ./-]+", " ", query).strip()
    words = [word.lower() for word in re.findall(r"[A-Za-z][A-Za-z0-9-]{2,}", normalized)]

    queries: list[str] = []
    for hint in _KNOWN_NAME_HINTS:
        if hint in words or hint in normalized.lower():
            queries.append(f"name:{hint}*")

    title_phrases = [
        phrase.strip()
        for phrase in re.split(r"[\n\r]+| {2,}", normalized)
        if 3 <= len(phrase.strip()) <= 40
    ]
    for phrase in title_phrases[:4]:
        clean = " ".join(word for word in phrase.split() if word.lower() not in _STOP_WORDS)
        if clean:
            queries.append(f'name:"{clean}*"')

    for word in words:
        if word not in _STOP_WORDS and len(word) >= 4:
            queries.append(f"name:{word}*")

    if not queries and normalized:
        queries.append(f'name:"{normalized[:40]}*"')

    # Preserve order while removing duplicates.
    return list(dict.fromkeys(queries))[:8]


def _signal_query(query: str) -> str:
    normalized = _normalize(query)
    words = [
        word
        for word in re.findall(r"[a-z0-9][a-z0-9-]*", normalized)
        if word not in _STOP_WORDS and (word.isdigit() or len(word) >= 2)
    ]
    for hint in _KNOWN_NAME_HINTS:
        if hint in normalized and hint not in words:
            words.append(hint)
    return " ".join(words) or normalized


def _query_variants(query: str) -> list[str]:
    raw_lines = [line.strip() for line in re.split(r"[\n\r]+", query) if line.strip()]
    variants: list[str] = []

    for line in raw_lines[:4]:
        # The card name usually appears before HP/type text on the first few OCR lines.
        titleish = re.split(r"\b(?:hp|stage|basic|evolves from)\b", line, maxsplit=1, flags=re.I)[0]
        variants.append(_signal_query(titleish))

    for index, line in enumerate(raw_lines[:4]):
        if index + 1 < len(raw_lines):
            variants.append(_signal_query(f"{line} {raw_lines[index + 1]}"))

    variants.extend(_signal_query(line) for line in raw_lines[:8])
    variants.append(_signal_query(query))

    normalized = _normalize(query)
    variants.extend(hint for hint in _KNOWN_NAME_HINTS if hint in normalized)

    return [variant for variant in dict.fromkeys(variants) if variant]


def _normalize(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", " ", value.lower())
    for hint in _KNOWN_NAME_HINTS:
        normalized = re.sub(rf"\bm{re.escape(hint)}\b", f"m {hint}", normalized)
    normalized = re.sub(r"\be\s*x\b", " ex ", normalized)
    normalized = re.sub(r"\bg\s*x\b", " gx ", normalized)
    normalized = re.sub(r"\bv\s*max\b", " vmax ", normalized)
    normalized = re.sub(r"\bv\s*star\b", " vstar ", normalized)
    normalized = re.sub(r"\btag\s*team\b", " tagteam ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def _score_card(query_variants: Iterable[str], card: TcgCard) -> float:
    variants = list(query_variants)
    scores = [
        max(_score_variant(variant, card) - min(index, 8) * 2, 0)
        for index, variant in enumerate(variants)
    ]
    if not scores:
        return 0.25
    return (max(scores) + _context_bonus(variants, card)) / 100


def _score_variant(query: str, card: TcgCard) -> float:
    if not re.search(r"[a-z]", query):
        return 0

    name = _normalize(card.name)
    query_specific_tokens = _specific_identity_tokens(query)
    if not query_specific_tokens:
        generic_score = 0
        if _special_tokens(query) & _special_tokens(name):
            generic_score += 10
        if _form_tokens(query) & _form_tokens(name):
            generic_score += 8
        return generic_score

    name_similarity = max(
        fuzz.WRatio(name, query),
        fuzz.token_set_ratio(name, query),
    )
    score = name_similarity

    if name and name in query:
        score += 12
    elif query and query in name and len(query) >= 4:
        score += 6

    if name_similarity >= 70:
        score += _special_token_score(query, name)
        score += _form_token_score(query, name)

    query_hints = _known_name_hints(query)
    if query_hints and not (query_hints & _known_name_hints(card.name)):
        score -= 36

    if _number_matches(query, card.number) and _has_card_identity_signal(query, card):
        score += 8
    if card.set_code and _normalize(card.set_code) in query:
        score += 4
    if card.set_name and _normalize(card.set_name) in query:
        score += 4

    return score


def _context_bonus(query_variants: Iterable[str], card: TcgCard) -> float:
    variants = list(query_variants)
    if not variants or not card.ocr_text:
        return 0

    query = max(variants, key=len)
    name = _normalize(card.name)
    name_similarity = fuzz.token_set_ratio(name, query) if name else 0

    context = _normalize(card.ocr_text)
    context_similarity = fuzz.token_set_ratio(context, query)
    overlap = _context_overlap_count(query, card)
    if name_similarity >= 80:
        return min(context_similarity * 0.22 + min(overlap * 3, 8), 28)
    if overlap >= 2:
        return min(10 + overlap * 4, 22)
    if overlap == 1 and context_similarity >= 85:
        return 8
    return 0


def _calibrated_confidence(
    query_variants: Iterable[str],
    card: TcgCard,
    score: float,
    next_score: float,
    rank: int,
) -> float:
    variants = list(query_variants)
    confidence = min(score / 1.25, 0.99)
    name_evidence = _name_evidence_level(variants, card)
    context_evidence = max((_context_overlap_count(variant, card) for variant in variants), default=0)

    missing_specials = _query_special_tokens(variants) - _special_tokens(card.name)
    if missing_specials:
        confidence = min(confidence, 0.58)
        if "mega" in missing_specials:
            confidence = min(confidence, 0.52)

    if name_evidence == 0 and context_evidence == 0:
        confidence = min(confidence, 0.44)
    elif name_evidence <= 1 and context_evidence == 0:
        confidence = min(confidence, 0.68)
    elif name_evidence == 0 and context_evidence:
        confidence = min(confidence, 0.72)
    elif name_evidence <= 1 and context_evidence:
        confidence = min(confidence, 0.82)

    if context_evidence >= 2 and not missing_specials:
        confidence = max(confidence, min(0.52 + context_evidence * 0.05, 0.72))

    gap = score - next_score
    if rank == 0:
        if gap < 0.015:
            confidence = min(confidence, 0.78)
        elif gap < 0.04:
            confidence = min(confidence, 0.86)
    else:
        confidence -= min(0.16, rank * 0.05)

    return max(0.15, min(confidence, 0.99))


def _number_matches(query: str, number: str) -> bool:
    normalized_number = _normalize(number).lstrip("0")
    if not normalized_number:
        return False
    query_numbers = {token.lstrip("0") for token in re.findall(r"\b\d+[a-z]?\b", query)}
    return normalized_number in query_numbers


def _has_card_identity_signal(query: str, card: TcgCard) -> bool:
    name = _normalize(card.name)
    set_name = _normalize(card.set_name)
    set_code = _normalize(card.set_code)
    return bool(
        (name and max(fuzz.WRatio(name, query), fuzz.token_set_ratio(name, query)) >= 70)
        or (set_name and set_name in query)
        or (set_code and set_code in query)
    )


def _special_token_score(query: str, name: str) -> float:
    query_tokens = _special_tokens(query)
    if not query_tokens:
        return 0

    name_tokens = _special_tokens(name)
    matching_tokens = query_tokens & name_tokens
    missing_tokens = query_tokens - name_tokens
    score = 10 * len(matching_tokens)
    if missing_tokens:
        score -= 16 * len(missing_tokens)
        if "mega" in missing_tokens:
            score -= 16
    return score


def _form_token_score(query: str, name: str) -> float:
    query_forms = _query_form_tokens_near_name(query, name)
    if not query_forms:
        return 0

    name_forms = _form_tokens(name)
    matching_tokens = query_forms & name_forms
    missing_tokens = query_forms - name_forms
    score = 14 * len(matching_tokens)
    if missing_tokens:
        score -= 22 * len(missing_tokens) if name_forms else 6 * len(missing_tokens)
    return score


def _special_tokens(value: str) -> set[str]:
    normalized = _normalize(value)
    tokens = set(normalized.split())
    specials = {token for token in tokens if token in _SPECIAL_NAME_TOKENS}
    if _MEGA_ALIAS_RE.search(normalized):
        specials.add("mega")
    return specials


def _form_tokens(value: str) -> set[str]:
    return set(_normalize(value).split()) & _FORM_NAME_TOKENS


def _query_form_tokens_near_name(query: str, name: str) -> set[str]:
    tokens = _normalize(query).split()
    name_content_tokens = {
        token
        for token in _normalize(name).split()
        if len(token) >= 3
        and token not in _STOP_WORDS
        and token not in _SPECIAL_NAME_TOKENS
        and token not in _FORM_NAME_TOKENS
    }
    if not tokens or not name_content_tokens:
        return set()

    forms: set[str] = set()
    for index, token in enumerate(tokens):
        if token not in name_content_tokens:
            continue
        nearby = tokens[max(0, index - 1) : min(len(tokens), index + 4)]
        forms.update(token for token in nearby if token in _FORM_NAME_TOKENS)
    return forms


def _identity_tokens(value: str) -> set[str]:
    normalized = _normalize(value)
    tokens = set(normalized.split())
    if "mega" in _special_tokens(value):
        tokens.discard("m")
        tokens.add("mega")
    return {
        token
        for token in tokens
        if token in _SPECIAL_NAME_TOKENS
        or (len(token) >= 2 and token not in _STOP_WORDS and not token.isdigit())
    }


def _specific_identity_tokens(value: str) -> set[str]:
    return {
        token
        for token in _identity_tokens(value)
        if token not in _SPECIAL_NAME_TOKENS and token not in _FORM_NAME_TOKENS and len(token) >= 3
    }


def _name_evidence_level(query_variants: Iterable[str], card: TcgCard) -> int:
    name_tokens = _identity_tokens(card.name)
    if not name_tokens:
        return 0

    content_tokens = _specific_identity_tokens(card.name)
    best_level = 0
    name = _normalize(card.name)
    for variant in query_variants:
        variant_tokens = _identity_tokens(variant)
        if name and name in variant:
            return 3
        if name_tokens.issubset(variant_tokens):
            return 3
        if content_tokens and (
            content_tokens.issubset(variant_tokens)
            or (content_tokens & variant_tokens and fuzz.token_set_ratio(name, variant) >= 92)
        ):
            best_level = max(best_level, 2)
        elif content_tokens & variant_tokens:
            best_level = max(best_level, 1)
    return best_level


def _known_name_hints(value: str) -> set[str]:
    normalized = _normalize(value)
    return {hint for hint in _KNOWN_NAME_HINTS if hint in normalized}


def _query_special_tokens(query_variants: Iterable[str]) -> set[str]:
    specials: set[str] = set()
    for variant in query_variants:
        specials.update(_special_tokens(variant))
    return specials


def _context_overlap_count(query: str, card: TcgCard) -> int:
    if not card.ocr_text:
        return 0
    return len(_context_tokens(query) & _context_tokens(card.ocr_text))


def _context_tokens(value: str) -> set[str]:
    return {
        token
        for token in _normalize(value).split()
        if len(token) >= 4 and token not in _CONTEXT_STOP_WORDS and not token.isdigit()
    }


def best_local_candidate(query: str) -> ScanCandidate:
    return top_local_candidates(query, limit=1)[0]


def top_local_candidates(query: str, limit: int = 3) -> list[ScanCandidate]:
    return [card_to_candidate(card, confidence) for card, confidence in top_fuzzy_matches(query, MOCK_CARDS, limit)]


def top_catalog_candidates(query: str, cards: Iterable[TcgCard], limit: int = 3) -> list[ScanCandidate]:
    return [card_to_candidate(card, confidence) for card, confidence in top_fuzzy_matches(query, cards, limit)]
