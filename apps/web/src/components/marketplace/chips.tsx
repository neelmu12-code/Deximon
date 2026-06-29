import { listingStatusLabel, type ListingStatus } from "@/lib/marketplace";

export type Tone = "green" | "gold" | "blue" | "red" | "gray" | "neutral" | "ink" | "purple";

export const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-[#0f2a1d] text-[#8bdcae] border-[#1c4a33]",
  gold: "bg-[#2a2210] text-dx-gold border-[#5a4818]",
  blue: "bg-[#101a33] text-[#9bb6f0] border-[#1e3870]",
  red: "bg-[#2a0d10] text-[#ff8a8e] border-[#5a1a1f]",
  gray: "bg-[#1c1c22] text-ink3 border-[#2c2c33]",
  neutral: "bg-surface2 text-ink2 border-hair",
  ink: "bg-ink/10 text-ink border-ink/20",
  purple: "bg-[#1e1430] text-[#c4a9f0] border-[#3a2a5a]",
};

export const PILL =
  "inline-flex items-center rounded-full border px-2 py-[3px] text-[11px] font-medium";

const STATUS_DOT: Record<Tone, string> = {
  green: "bg-dx-green",
  gold: "bg-dx-gold",
  blue: "bg-[#9bb6f0]",
  red: "bg-[#ff8a8e]",
  gray: "bg-ink3",
  neutral: "bg-ink3",
  ink: "bg-ink",
  purple: "bg-[#c4a9f0]",
};

export function rarityTone(rarity: string): Tone {
  const r = rarity.toLowerCase();
  if (r.includes("secret")) return "gold";
  if (r.includes("ultra")) return "red";
  if (r.includes("holo")) return "blue";
  if (r.includes("rare")) return "ink";
  if (r.includes("uncommon")) return "neutral";
  return "gray";
}

export function conditionTone(condition: string): Tone {
  switch (condition.toUpperCase()) {
    case "NM":
      return "green";
    case "MP":
      return "gold";
    case "HP":
    case "DMG":
      return "red";
    default:
      return "neutral";
  }
}

export function typeTone(cardType: string): Tone {
  switch (cardType.toLowerCase()) {
    case "fire":
      return "red";
    case "water":
      return "blue";
    case "grass":
      return "green";
    case "lightning":
      return "gold";
    case "psychic":
      return "purple";
    default:
      return "neutral";
  }
}

export function statusTone(status: ListingStatus): Tone {
  switch (status) {
    case "available":
      return "green";
    case "on_hold":
      return "gold";
    default:
      return "gray";
  }
}

export function rarityRank(rarity: string | null): number {
  const r = (rarity ?? "").toLowerCase();
  if (r.includes("secret")) return 0;
  if (r.includes("ultra")) return 1;
  if (r.includes("holo")) return 2;
  if (r.includes("rare")) return 3;
  if (r.includes("uncommon")) return 4;
  if (r.includes("common")) return 5;
  return 6;
}

export function TonePill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`${PILL} ${TONE_CLASSES[tone]}`}>{children}</span>;
}

export function Chip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`${PILL} ${TONE_CLASSES.neutral} ${className}`}>{children}</span>;
}

export function StatusPill({ status }: { status: ListingStatus }) {
  const tone = statusTone(status);
  return (
    <span className={`${PILL} gap-1.5 ${TONE_CLASSES[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[tone]}`} />
      {listingStatusLabel(status)}
    </span>
  );
}
