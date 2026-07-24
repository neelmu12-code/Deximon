import { pokemonImageUrl } from "@/lib/cardDetails";

export type ListingStatus = "available" | "on_hold" | "sold" | "cancelled";

// The list endpoint caps results at 50 and the marketplace filters/sorts that
// page client-side. Listings past the 50 newest won't show up (and won't be
// counted in the facets) until the API grows real pagination.
export const LISTING_PAGE_LIMIT = 50;

export type ListingCard = {
  id: string;
  name: string;
  set_code: string | null;
  number: string | null;
  rarity: string | null;
  card_type: string | null;
  condition: string | null;
  language: string | null;
  holo_type: "normal" | "holo" | "reverse_holo";
  full_art: boolean;
  image_url: string | null;
};

export type ListingSeller = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avg_rating?: number | null;
  review_count?: number;
};

export type Listing = {
  id: string;
  card_id: string;
  seller_id: string;
  buyer_id: string | null;
  asking_price: number | null;
  notes: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  card: ListingCard;
  seller: ListingSeller;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_username: string;
  body: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  listing_id: string;
  requester_id: string;
  seller_id: string;
  requester_username: string;
  seller_username: string;
  listing_card_name: string;
  listing_price: number | null;
  listing_image_url: string | null;
  listing_status: ListingStatus;
  listing_buyer_id: string | null;
  last_message: Message | null;
  unread_count: number;
  created_at: string;
};

export type ConversationDetail = Conversation & {
  messages: Message[];
};

export function listingStatusLabel(status: ListingStatus): string {
  switch (status) {
    case "available":
      return "Available";
    case "on_hold":
      return "On Hold";
    case "sold":
      return "Sold";
    case "cancelled":
      return "Cancelled";
  }
}

export function formatPrice(price: number | null): string {
  if (price === null) return "Trade offer";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export function listingImageUrl(card: ListingCard): string | null {
  return card.image_url ?? pokemonImageUrl(card.set_code, card.number);
}
