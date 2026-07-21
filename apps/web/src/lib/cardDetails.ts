// Shared types, dropdown options, and helpers for the "confirm card details"
// step used by the scanner page and the manual-add flow. Keeping these in one
// place means both entry points offer the exact same constrained choices.

export type HoloType = "normal" | "holo" | "reverse_holo";

// Identity fields come from the TCG catalog and are never user-editable.
export type CardIdentity = {
  name: string;
  set_name: string;
  set_code: string | null;
  number: string;
  image_url: string | null;
};

// The only fields a user is allowed to set/correct (hard to read off a scan).
export type CardDetails = {
  rarity: string;
  holo_type: HoloType;
  full_art: boolean;
  condition: string;
  language: string;
};

// A row returned by GET /cards/search.
export type SearchCard = {
  id: string;
  name: string;
  set: string;
  set_name: string;
  num: string;
  rarity: string;
  image: string;
};

// An owned-card row as returned by the binder/cards backend. Shared so the
// binder, the list-a-card picker, and anything else reading owned cards agree
// on one shape instead of redeclaring it.
export type BackendOwnedCard = {
  id: string;
  name: string;
  set_code: string | null;
  number: string | null;
  rarity: string | null;
  condition: string | null;
  language: string | null;
  holo_type: HoloType;
  full_art: boolean;
  image_url: string | null;
};

export const HOLO_OPTIONS: { value: HoloType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "holo", label: "Holo" },
  { value: "reverse_holo", label: "Reverse holo" },
];

export const CONDITION_OPTIONS: { value: string; label: string }[] = [
  { value: "NM", label: "Near Mint" },
  { value: "LP", label: "Lightly Played" },
  { value: "MP", label: "Moderately Played" },
  { value: "HP", label: "Heavily Played" },
  { value: "DMG", label: "Damaged" },
];

// Only English, Japanese, and Chinese cards are supported.
export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "EN", label: "English" },
  { value: "JP", label: "Japanese" },
  { value: "ZH", label: "Chinese" },
];

// Curated rarities the user can choose from. A detected/catalog rarity that
// isn't on this list is merged in by rarityOptions() so it's never lost.
export const RARITY_OPTIONS: string[] = [
  "Common",
  "Uncommon",
  "Rare",
  "Rare Holo",
  "Reverse Holo",
  "Ultra Rare",
  "Secret Rare",
  "Illustration Rare",
  "Special Illustration Rare",
  "Promo",
];

export function rarityOptions(detected?: string | null): string[] {
  const trimmed = detected?.trim();
  if (trimmed && !RARITY_OPTIONS.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
    return [trimmed, ...RARITY_OPTIONS];
  }
  return RARITY_OPTIONS;
}

export function inferHoloType(rarity: string | null | undefined): HoloType {
  return rarity?.toLowerCase().includes("holo") ? "holo" : "normal";
}

export function normalizeLanguage(language: string | null | undefined): string {
  const code = (language ?? "EN").toUpperCase();
  return LANGUAGE_OPTIONS.some((o) => o.value === code) ? code : "EN";
}

export function languageLabel(value: string | null | undefined): string {
  if (!value) return "—";
  // "JA" is the ISO-639 code; some sources send it where we store "JP".
  const code = value.toUpperCase() === "JA" ? "JP" : value.toUpperCase();
  return LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? value;
}

export function conditionLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return CONDITION_OPTIONS.find((o) => o.value === value.toUpperCase())?.label ?? value;
}

export function holoLabel(value: string | null | undefined): string {
  return HOLO_OPTIONS.find((o) => o.value === (value ?? "normal"))?.label ?? "Normal";
}

// Public card art served by the pokemontcg.io CDN. Numbers can arrive in the
// collector "4/102" format; the CDN only wants the leading index.
export function pokemonImageUrl(
  setCode: string | null,
  number: string | null,
): string | null {
  if (!setCode || !number) return null;
  return `https://images.pokemontcg.io/${setCode}/${number.split("/")[0]}.png`;
}

// Sensible defaults for the editable fields given whatever the catalog/scan knew.
export function defaultDetails(source: { rarity?: string | null }): CardDetails {
  const rarity = source.rarity?.trim() || "Common";
  return {
    rarity,
    holo_type: inferHoloType(rarity),
    full_art: false,
    condition: "NM",
    language: "EN",
  };
}
