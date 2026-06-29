"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ListCardModal } from "@/components/binder/ListCardModal";
import {
  PILL,
  StatusPill,
  TONE_CLASSES,
  TonePill,
  conditionTone,
  rarityRank,
  rarityTone,
  statusTone,
  typeTone,
  type Tone,
} from "@/components/marketplace/chips";
import { ListCardPicker } from "@/components/marketplace/ListCardPicker";
import { Stars } from "@/components/ui/Stars";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { CardSlot } from "@/lib/binderTypes";
import { useAuth } from "@/lib/auth";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import {
  formatPrice,
  listingImageUrl,
  listingStatusLabel,
  type Listing,
  type ListingCard,
  type ListingStatus,
} from "@/lib/marketplace";

const CONDITION_ORDER = ["NM", "LP", "MP", "HP", "DMG"];

// ─── Small presentational atoms ──────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3,4.5 6,7.5 9,4.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="4.5" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" />
    </svg>
  );
}

function FilterAccordion({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-hair pt-3 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-[11px] uppercase tracking-[0.18em] text-ink3 hover:text-ink2"
      >
        {title}
        <ChevronIcon open={open} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function FilterCheckbox({
  checked,
  onToggle,
  label,
  mono = false,
  count,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  mono?: boolean;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group flex w-full items-center gap-2 py-1 text-left"
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked ? "border-dx-red bg-dx-red" : "border-hair"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2.5,6.5 5,9 9.5,3.5" />
          </svg>
        )}
      </span>
      <span
        className={`flex-1 truncate text-[13px] text-ink2 group-hover:text-ink ${mono ? "font-mono" : ""}`}
      >
        {label}
      </span>
      {count != null && <span className="text-[11px] text-ink3">{count}</span>}
    </button>
  );
}

function ToggleChip({
  selected,
  onToggle,
  tone,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`${PILL} transition-colors ${
        selected ? TONE_CLASSES[tone] : "border-hair bg-surface2 text-ink3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Image with graceful fallback ────────────────────────────────────────────

function CardArt({ card }: { card: ListingCard }) {
  const src = listingImageUrl(card);
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-ink3">
        {card.name}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={card.name}
      fill
      unoptimized
      sizes="(max-width: 768px) 50vw, 20vw"
      className="object-contain"
      onError={() => setErrored(true)}
    />
  );
}

// ─── Facet derivation ────────────────────────────────────────────────────────

type Facet = { value: string; count: number };

function deriveFacet(
  listings: Listing[],
  accessor: (card: ListingCard) => string | null,
  order?: string[],
): Facet[] {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    const value = accessor(listing.card);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const facets = [...counts.entries()].map(([value, count]) => ({ value, count }));
  if (order) {
    facets.sort((a, b) => {
      const ai = order.indexOf(a.value);
      const bi = order.indexOf(b.value);
      if (ai === -1 && bi === -1) return a.value.localeCompare(b.value);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  } else {
    facets.sort((a, b) => a.value.localeCompare(b.value));
  }
  return facets;
}

const STATUS_VALUES: ListingStatus[] = ["available", "on_hold", "sold"];

type SortKey = "newest" | "price_asc" | "price_desc" | "rarity";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
  { value: "rarity", label: "Rarity" },
];

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Could not load marketplace listings.";
}

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

const PRICE_CAP_FALLBACK = 1000;

export function MarketplaceClient() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [cardToList, setCardToList] = useState<NonNullable<CardSlot> | null>(null);

  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
  const [selectedRarities, setSelectedRarities] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(["available"]));
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    const controller = new AbortController();
    const search = new URLSearchParams({ limit: "50" });
    const trimmed = query.trim();
    if (trimmed) search.set("q", trimmed);

    setLoading(true);
    fetchAPI<Listing[]>(`/market/listings?${search.toString()}`, { signal: controller.signal })
      .then((data) => {
        setListings(data ?? []);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(errorMessage(loadError));
        setListings([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query, refreshKey]);

  const setFacets = useMemo(() => deriveFacet(listings, (c) => c.set_code), [listings]);
  const rarityFacets = useMemo(() => deriveFacet(listings, (c) => c.rarity), [listings]);
  const typeFacets = useMemo(() => deriveFacet(listings, (c) => c.card_type), [listings]);
  const conditionFacets = useMemo(
    () => deriveFacet(listings, (c) => c.condition, CONDITION_ORDER),
    [listings],
  );
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const listing of listings) {
      counts.set(listing.status, (counts.get(listing.status) ?? 0) + 1);
    }
    return counts;
  }, [listings]);

  const maxPrice = useMemo(() => {
    const max = listings.reduce((acc, l) => Math.max(acc, l.asking_price ?? 0), 0);
    return max > 0 ? Math.ceil(max) : PRICE_CAP_FALLBACK;
  }, [listings]);

  const priceMin = priceRange?.min ?? 0;
  const priceMax = priceRange?.max ?? maxPrice;
  const priceActive = priceRange != null && (priceRange.min > 0 || priceRange.max < maxPrice);

  const results = useMemo(() => {
    const filtered = listings.filter((l) => {
      const c = l.card;
      if (selectedSets.size && !(c.set_code && selectedSets.has(c.set_code))) return false;
      if (selectedRarities.size && !(c.rarity && selectedRarities.has(c.rarity))) return false;
      if (selectedTypes.size && !(c.card_type && selectedTypes.has(c.card_type))) return false;
      if (selectedConditions.size && !(c.condition && selectedConditions.has(c.condition)))
        return false;
      if (selectedStatuses.size && !selectedStatuses.has(l.status)) return false;
      if (priceActive && l.asking_price != null) {
        if (l.asking_price < priceMin || l.asking_price > priceMax) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    switch (sort) {
      case "price_asc":
        sorted.sort((a, b) => (a.asking_price ?? Infinity) - (b.asking_price ?? Infinity));
        break;
      case "price_desc":
        sorted.sort((a, b) => (b.asking_price ?? -Infinity) - (a.asking_price ?? -Infinity));
        break;
      case "rarity":
        sorted.sort((a, b) => rarityRank(a.card.rarity) - rarityRank(b.card.rarity));
        break;
      default:
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return sorted;
  }, [
    listings,
    selectedSets,
    selectedRarities,
    selectedTypes,
    selectedConditions,
    selectedStatuses,
    priceActive,
    priceMin,
    priceMax,
    sort,
  ]);

  const hasFilters =
    selectedSets.size > 0 ||
    selectedRarities.size > 0 ||
    selectedTypes.size > 0 ||
    selectedConditions.size > 0 ||
    selectedStatuses.size > 0 ||
    priceActive;

  function clearAll() {
    setSelectedSets(new Set());
    setSelectedRarities(new Set());
    setSelectedTypes(new Set());
    setSelectedConditions(new Set());
    setSelectedStatuses(new Set());
    setPriceRange(null);
  }

  const activeChips: Array<{ key: string; label: string; tone: Tone; onRemove: () => void }> = [];
  for (const value of selectedSets) {
    activeChips.push({
      key: `set:${value}`,
      label: value,
      tone: "neutral",
      onRemove: () => setSelectedSets((s) => toggle(s, value)),
    });
  }
  for (const value of selectedRarities) {
    activeChips.push({
      key: `rarity:${value}`,
      label: value,
      tone: rarityTone(value),
      onRemove: () => setSelectedRarities((s) => toggle(s, value)),
    });
  }
  for (const value of selectedTypes) {
    activeChips.push({
      key: `type:${value}`,
      label: value,
      tone: typeTone(value),
      onRemove: () => setSelectedTypes((s) => toggle(s, value)),
    });
  }
  for (const value of selectedConditions) {
    activeChips.push({
      key: `cond:${value}`,
      label: `Cond: ${value}`,
      tone: conditionTone(value),
      onRemove: () => setSelectedConditions((s) => toggle(s, value)),
    });
  }
  for (const value of selectedStatuses) {
    activeChips.push({
      key: `status:${value}`,
      label: listingStatusLabel(value as ListingStatus),
      tone: statusTone(value as ListingStatus),
      onRemove: () => setSelectedStatuses((s) => toggle(s, value)),
    });
  }
  if (priceActive) {
    activeChips.push({
      key: "price",
      label: `Price: ${formatPrice(priceMin)}–${formatPrice(priceMax)}`,
      tone: "neutral",
      onRemove: () => setPriceRange(null),
    });
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 xl:col-span-2">
          <div className="sticky top-20 rounded-xl bg-surface p-4">
            <div className="mb-4 text-[11px] uppercase tracking-[0.22em] text-ink3">Filters</div>

            <div className="relative mb-4">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink3">
                <SearchIcon />
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search cards"
                className="h-9 w-full rounded-md border border-hair bg-surface2 pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink3 focus:border-ink3"
              />
            </div>

            <div className="space-y-3">
              <FilterAccordion title="Set">
                <div className="space-y-0.5">
                  {setFacets.length === 0 && <p className="text-[12px] text-ink3">No sets</p>}
                  {setFacets.map((facet) => (
                    <FilterCheckbox
                      key={facet.value}
                      checked={selectedSets.has(facet.value)}
                      onToggle={() => setSelectedSets((s) => toggle(s, facet.value))}
                      label={facet.value}
                      mono
                      count={facet.count}
                    />
                  ))}
                </div>
              </FilterAccordion>

              <FilterAccordion title="Rarity">
                <div className="flex flex-wrap gap-1.5">
                  {rarityFacets.length === 0 && <p className="text-[12px] text-ink3">None</p>}
                  {rarityFacets.map((facet) => (
                    <ToggleChip
                      key={facet.value}
                      selected={selectedRarities.has(facet.value)}
                      onToggle={() => setSelectedRarities((s) => toggle(s, facet.value))}
                      tone={rarityTone(facet.value)}
                    >
                      {facet.value}
                    </ToggleChip>
                  ))}
                </div>
              </FilterAccordion>

              <FilterAccordion title="Type">
                <div className="flex flex-wrap gap-1.5">
                  {typeFacets.length === 0 && <p className="text-[12px] text-ink3">None</p>}
                  {typeFacets.map((facet) => (
                    <ToggleChip
                      key={facet.value}
                      selected={selectedTypes.has(facet.value)}
                      onToggle={() => setSelectedTypes((s) => toggle(s, facet.value))}
                      tone={typeTone(facet.value)}
                    >
                      {facet.value}
                    </ToggleChip>
                  ))}
                </div>
              </FilterAccordion>

              <FilterAccordion title="Condition">
                <div className="flex flex-wrap gap-1.5">
                  {conditionFacets.length === 0 && <p className="text-[12px] text-ink3">None</p>}
                  {conditionFacets.map((facet) => (
                    <ToggleChip
                      key={facet.value}
                      selected={selectedConditions.has(facet.value)}
                      onToggle={() => setSelectedConditions((s) => toggle(s, facet.value))}
                      tone={conditionTone(facet.value)}
                    >
                      {facet.value}
                    </ToggleChip>
                  ))}
                </div>
              </FilterAccordion>

              <FilterAccordion title="Price">
                <div className="mb-2 flex justify-between text-[11px] text-ink2 tabular-nums">
                  <span>{formatPrice(priceMin)}</span>
                  <span>
                    {formatPrice(priceMax)}
                    {priceMax >= maxPrice ? "+" : ""}
                  </span>
                </div>
                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={maxPrice}
                    value={priceMin}
                    onChange={(event) => {
                      const value = Math.min(Number(event.target.value), priceMax);
                      setPriceRange({ min: value, max: priceMax });
                    }}
                    className="w-full accent-dx-red"
                  />
                  <input
                    type="range"
                    min={0}
                    max={maxPrice}
                    value={priceMax}
                    onChange={(event) => {
                      const value = Math.max(Number(event.target.value), priceMin);
                      setPriceRange({ min: priceMin, max: value });
                    }}
                    className="w-full accent-dx-red"
                  />
                </div>
              </FilterAccordion>

              <FilterAccordion title="Status">
                <div className="space-y-0.5">
                  {STATUS_VALUES.map((value) => (
                    <FilterCheckbox
                      key={value}
                      checked={selectedStatuses.has(value)}
                      onToggle={() => setSelectedStatuses((s) => toggle(s, value))}
                      label={listingStatusLabel(value)}
                      count={statusCounts.get(value) ?? 0}
                    />
                  ))}
                </div>
              </FilterAccordion>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-8 lg:col-span-9 xl:col-span-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-bold">Marketplace</h1>
              <span className="text-[13px] text-ink3">{results.length} listings</span>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-dx-red px-4 text-[13px] font-medium text-white transition-colors hover:bg-dx-red-hover"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <line x1="8" y1="3" x2="8" y2="13" />
                    <line x1="3" y1="8" x2="13" y2="8" />
                  </svg>
                  List a card
                </button>
              )}
              <label className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-ink3">Sort</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  className="h-9 rounded-md border border-hair bg-surface2 px-3 text-[13px] text-ink outline-none focus:border-ink3"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Active-filter bar */}
          {hasFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <span
                  key={chip.key}
                  className={`${PILL} gap-1.5 ${TONE_CLASSES[chip.tone]}`}
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Remove ${chip.label}`}
                    className="text-ink3 hover:text-ink"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] text-dx-blue hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-hair bg-surface p-12 text-center text-ink3">
              Loading listings…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-[#5a1a1f] bg-[#2a0d10] p-4 text-sm text-[#ff8a8e]">
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="rounded-xl border border-hair bg-surface p-12 text-center text-ink2">
              No listings match these filters. Try removing a filter or widening the price range.
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {results.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/market/${listing.id}`}
                  className="rounded-xl border border-hair bg-surface p-3 transition-colors hover:border-ink3"
                >
                  <div className="card-ratio relative mb-3 overflow-hidden rounded-lg bg-surface2">
                    <span className="absolute left-2 top-2 z-10">
                      <StatusPill status={listing.status} />
                    </span>
                    <CardArt card={listing.card} />
                  </div>

                  <h2 className="truncate text-sm font-semibold">{listing.card.name}</h2>
                  <p className="font-mono text-[11px] text-ink3">
                    {[listing.card.set_code, listing.card.number].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 font-bold text-dx-red">{formatPrice(listing.asking_price)}</p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {listing.card.rarity && (
                      <TonePill tone={rarityTone(listing.card.rarity)}>
                        {listing.card.rarity}
                      </TonePill>
                    )}
                    {listing.card.condition && (
                      <TonePill tone={conditionTone(listing.card.condition)}>
                        {listing.card.condition}
                      </TonePill>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-hair pt-3">
                    <UserAvatar
                      username={listing.seller.username}
                      displayName={listing.seller.display_name}
                      avatarUrl={listing.seller.avatar_url}
                      size={20}
                    />
                    <span className="truncate text-[11px] text-ink2">
                      @{listing.seller.username}
                    </span>
                    {(listing.seller.review_count ?? 0) > 0 && (
                      <span className="ml-auto">
                        <Stars
                          rating={listing.seller.avg_rating ?? 0}
                          reviews={listing.seller.review_count}
                        />
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>

      {showPicker && (
        <ListCardPicker
          onClose={() => setShowPicker(false)}
          onPick={(card) => {
            setShowPicker(false);
            setCardToList(card);
          }}
        />
      )}

      {cardToList && (
        <ListCardModal
          card={cardToList}
          onClose={() => setCardToList(null)}
          onListed={() => setRefreshKey((key) => key + 1)}
        />
      )}
    </div>
  );
}
