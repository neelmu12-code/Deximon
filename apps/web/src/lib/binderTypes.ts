import type { CardSlot } from "@/components/profile/BinderPreview";
import type { BackendOwnedCard } from "@/lib/cardDetails";
import { pokemonImageUrl } from "@/lib/cardDetails";
export type { CardSlot };

export const COVER_COLORS = [
  { id: 'oxblood',  label: 'Oxblood',      a: '#3b0a0e', b: '#260608', c: '#150305' },
  { id: 'navy',     label: 'Navy',          a: '#0a1a3b', b: '#060f26', c: '#030815' },
  { id: 'forest',   label: 'Forest',        a: '#0a3b1f', b: '#062612', c: '#031508' },
  { id: 'charcoal', label: 'Charcoal',      a: '#1a1a1a', b: '#0a0a0a', c: '#050505' },
  { id: 'plum',     label: 'Plum',          a: '#2a0a3b', b: '#180626', c: '#0c0315' },
  { id: 'gold',     label: 'Midnight Gold', a: '#3b2a0a', b: '#261c06', c: '#150e03' },
  { id: 'crimson',  label: 'Crimson',       a: '#3b0a1a', b: '#26060f', c: '#150308' },
  { id: 'steel',    label: 'Steel',         a: '#1a1f2b', b: '#0e1219', c: '#070910' },
] as const;

export type CoverColorId = typeof COVER_COLORS[number]['id'];

export type BinderCoverConfig = {
  type: 'color' | 'image';
  colorId: CoverColorId;
  showName: boolean;
  imageUrl: string | null;
};

export const DEFAULT_COVER: BinderCoverConfig = {
  type: 'color',
  colorId: 'oxblood',
  showName: true,
  imageUrl: null,
};

// Placeholder image shown when a card has no image URL
export const PLACEHOLDER_CARD_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 250 350'%3E%3Crect width='250' height='350' rx='18' fill='%23201916'/%3E%3Crect x='18' y='18' width='214' height='314' rx='14' fill='none' stroke='%23715a32' stroke-width='4' stroke-dasharray='12 10'/%3E%3Ctext x='125' y='178' text-anchor='middle' fill='%23b99a52' font-family='Arial' font-size='20'%3EDeximon%3C/text%3E%3C/svg%3E";

// These match the shape of what the backend sends back from GET /binder/me and GET /binder/{username}
export type BackendBinderSlot = {
  slot_index: number;
  card: BackendOwnedCard | null;
};

export type BackendBinderPage = {
  page_index: number;
  slots: BackendBinderSlot[];
};

export type BackendBinderResponse = {
  owner_id: string;
  pages: BackendBinderPage[];
};

// Picks the best image for a card — stored URL first, then CDN fallback, then placeholder
function imageForCard(card: BackendOwnedCard): string {
  return card.image_url ?? pokemonImageUrl(card.set_code, card.number) ?? PLACEHOLDER_CARD_IMAGE;
}

// Converts the raw backend response into CardSlot[][] — the shape BinderPreview and BinderSpread expect.
// Shared here so both the personal binder page and the public profile page use identical logic.
export function mapBackendBinder(binder: BackendBinderResponse): CardSlot[][] {
  const orderedPages = [...binder.pages].sort((a, b) => a.page_index - b.page_index);
  if (orderedPages.length === 0) return [[...Array(9)].map(() => null) as CardSlot[]];

  return orderedPages.map((page) => {
    const slots = [...Array(9)].map(() => null) as CardSlot[];
    for (const slot of page.slots) {
      if (!slot.card || slot.slot_index < 0 || slot.slot_index > 8) continue;
      slots[slot.slot_index] = {
        id: slot.card.id,
        name: slot.card.name,
        set: slot.card.set_code ?? "",
        num: slot.card.number ?? "",
        rarity: slot.card.rarity ?? "",
        condition: slot.card.condition,
        language: slot.card.language,
        holo_type: slot.card.holo_type,
        image: imageForCard(slot.card),
      };
    }
    return slots;
  });
}
