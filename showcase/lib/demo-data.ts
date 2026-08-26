export type DemoView =
  | "scanner"
  | "binder"
  | "marketplace"
  | "listing"
  | "profile"
  | "inbox"
  | "notifications"
  | "reviews";

export type DemoCard = {
  id: string;
  name: string;
  set: string;
  number: string;
  rarity: string;
  condition: "NM" | "LP" | "MP";
  image: string;
  holo: boolean;
};

export type DemoListing = {
  id: string;
  cardId: string;
  price: number;
  seller: string;
  sellerName: string;
  sellerRating: number;
  status: "Available" | "On hold" | "Sold";
  notes: string;
};

export type DemoNotification = {
  id: string;
  kind: "message" | "listing" | "review";
  text: string;
  time: string;
  read: boolean;
};

export type DemoMessage = {
  id: string;
  from: "visitor" | "seller";
  body: string;
  time: string;
};

export const DEMO_CARDS: DemoCard[] = [
  {
    id: "base1-4",
    name: "Charizard",
    set: "Base Set",
    number: "4/102",
    rarity: "Rare Holo",
    condition: "NM",
    image: "https://images.pokemontcg.io/base1/4_hires.png",
    holo: true,
  },
  {
    id: "base1-10",
    name: "Mewtwo",
    set: "Base Set",
    number: "10/102",
    rarity: "Rare Holo",
    condition: "NM",
    image: "https://images.pokemontcg.io/base1/10_hires.png",
    holo: true,
  },
  {
    id: "base1-2",
    name: "Blastoise",
    set: "Base Set",
    number: "2/102",
    rarity: "Rare Holo",
    condition: "LP",
    image: "https://images.pokemontcg.io/base1/2_hires.png",
    holo: true,
  },
  {
    id: "base1-15",
    name: "Venusaur",
    set: "Base Set",
    number: "15/102",
    rarity: "Rare Holo",
    condition: "NM",
    image: "https://images.pokemontcg.io/base1/15_hires.png",
    holo: true,
  },
  {
    id: "base1-14",
    name: "Raichu",
    set: "Base Set",
    number: "14/102",
    rarity: "Rare Holo",
    condition: "NM",
    image: "https://images.pokemontcg.io/base1/14_hires.png",
    holo: true,
  },
  {
    id: "base1-6",
    name: "Gyarados",
    set: "Base Set",
    number: "6/102",
    rarity: "Rare Holo",
    condition: "LP",
    image: "https://images.pokemontcg.io/base1/6_hires.png",
    holo: true,
  },
  {
    id: "base1-58",
    name: "Pikachu",
    set: "Base Set",
    number: "58/102",
    rarity: "Common",
    condition: "NM",
    image: "https://images.pokemontcg.io/base1/58_hires.png",
    holo: false,
  },
  {
    id: "base1-7",
    name: "Hitmonchan",
    set: "Base Set",
    number: "7/102",
    rarity: "Rare Holo",
    condition: "MP",
    image: "https://images.pokemontcg.io/base1/7_hires.png",
    holo: true,
  },
  {
    id: "base1-63",
    name: "Squirtle",
    set: "Base Set",
    number: "63/102",
    rarity: "Common",
    condition: "NM",
    image: "https://images.pokemontcg.io/base1/63_hires.png",
    holo: false,
  },
];

export const SCAN_CARD: DemoCard = {
  id: "base1-58-scan",
  name: "Pikachu",
  set: "Base Set",
  number: "58/102",
  rarity: "Common",
  condition: "NM",
  image: "https://images.pokemontcg.io/base1/58_hires.png",
  holo: false,
};

export const DEMO_LISTINGS: DemoListing[] = [
  {
    id: "listing-charizard",
    cardId: "base1-4",
    price: 892,
    seller: "foilfiend",
    sellerName: "Mara Chen",
    sellerRating: 4.9,
    status: "Available",
    notes: "Clean front, light edge wear on the reverse. Stored sleeved and top-loaded.",
  },
  {
    id: "listing-mewtwo",
    cardId: "base1-10",
    price: 245,
    seller: "kintsugi",
    sellerName: "Theo Park",
    sellerRating: 4.8,
    status: "On hold",
    notes: "Strong holo surface with one small whitening mark on the lower edge.",
  },
  {
    id: "listing-blastoise",
    cardId: "base1-2",
    price: 380,
    seller: "oxblood",
    sellerName: "Iris Bell",
    sellerRating: 5,
    status: "Available",
    notes: "Binder-kept copy with bright color and a clean holo field.",
  },
  {
    id: "listing-venusaur",
    cardId: "base1-15",
    price: 285,
    seller: "goldleaf_77",
    sellerName: "Jonah Reed",
    sellerRating: 4.7,
    status: "Sold",
    notes: "Well-centered copy from a personal collection.",
  },
  {
    id: "listing-raichu",
    cardId: "base1-14",
    price: 92.5,
    seller: "ashen_lake",
    sellerName: "Nia Brooks",
    sellerRating: 4.9,
    status: "Available",
    notes: "Near-mint card with a bright holo and sharp corners.",
  },
  {
    id: "listing-gyarados",
    cardId: "base1-6",
    price: 145,
    seller: "duskmoth",
    sellerName: "Sam Rivera",
    sellerRating: 4.8,
    status: "Available",
    notes: "Lightly played, photographed under neutral light.",
  },
];

export const INITIAL_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "notification-1",
    kind: "message",
    text: "foilfiend replied about Charizard · Base Set 4/102",
    time: "4m",
    read: false,
  },
  {
    id: "notification-2",
    kind: "listing",
    text: "A saved Mewtwo listing changed to On hold",
    time: "18m",
    read: false,
  },
  {
    id: "notification-3",
    kind: "review",
    text: "kintsugi left you a 5-star review",
    time: "Yesterday",
    read: true,
  },
];

export const INITIAL_MESSAGES: DemoMessage[] = [
  {
    id: "message-1",
    from: "visitor",
    body: "Hi! Is the whitening visible without direct light?",
    time: "10:42",
  },
  {
    id: "message-2",
    from: "seller",
    body: "Only at an angle. I added a close-up to the listing so you can judge it clearly.",
    time: "10:45",
  },
  {
    id: "message-3",
    from: "seller",
    body: "I can also hold it until tomorrow if you need time.",
    time: "10:46",
  },
];

export function cardById(id: string): DemoCard {
  return DEMO_CARDS.find((card) => card.id === id) ?? DEMO_CARDS[0];
}

export const DEMO_NAV: Array<{ id: DemoView; label: string; short: string }> = [
  { id: "scanner", label: "Card scanner", short: "Scan" },
  { id: "binder", label: "Digital binder", short: "Binder" },
  { id: "marketplace", label: "Marketplace", short: "Market" },
  { id: "listing", label: "Listing detail", short: "Listing" },
  { id: "profile", label: "Collector profile", short: "Profile" },
  { id: "inbox", label: "Conversations", short: "Inbox" },
  { id: "notifications", label: "Notifications", short: "Alerts" },
  { id: "reviews", label: "Reviews", short: "Reviews" },
];
