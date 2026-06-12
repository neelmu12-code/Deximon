export type ListingStatus = "available" | "on_hold" | "sold" | "cancelled";

export type ListingCard = {
  id: string;
  name: string;
  set_code: string | null;
  number: string | null;
  rarity: string | null;
  condition: string | null;
  language: string | null;
  holo_type: "normal" | "holo" | "reverse_holo";
};

export type ListingSeller = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Listing = {
  id: string;
  card_id: string;
  seller_id: string;
  asking_price: number | null;
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
  listing_status: ListingStatus;
  last_message: Message | null;
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
