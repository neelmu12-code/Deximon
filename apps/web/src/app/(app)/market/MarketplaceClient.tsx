"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import {
  formatPrice,
  listingStatusLabel,
  type Listing,
  type ListingStatus,
} from "@/lib/marketplace";

const STATUS_OPTIONS: Array<"" | ListingStatus> = ["", "available", "on_hold", "sold"];

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Could not load marketplace listings.";
}

export function MarketplaceClient() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ListingStatus>("");
  const [setCode, setSetCode] = useState("");
  const [rarity, setRarity] = useState("");
  const [cardType, setCardType] = useState("");
  const [condition, setCondition] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    const trimmed = query.trim();
    if (trimmed) search.set("q", trimmed);
    if (statusFilter) search.set("status", statusFilter);
    if (setCode.trim()) search.set("set", setCode.trim());
    if (rarity.trim()) search.set("rarity", rarity.trim());
    if (cardType.trim()) search.set("type", cardType.trim());
    if (condition.trim()) search.set("condition", condition.trim());
    return search.toString();
  }, [query, statusFilter, setCode, rarity, cardType, condition]);

  const hasFilters = Boolean(
    query || statusFilter || setCode || rarity || cardType || condition,
  );

  function clearFilters() {
    setQuery("");
    setStatusFilter("");
    setSetCode("");
    setRarity("");
    setCardType("");
    setCondition("");
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchAPI<Listing[]>(`/market/listings${params ? `?${params}` : ""}`, {
      signal: controller.signal,
    })
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
  }, [params]);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Marketplace</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Browse cards listed by other collectors. Filters call the backend
          marketplace endpoint and can grow as the listing model grows.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-3 rounded border border-neutral-300 p-4 text-sm dark:border-neutral-700">
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, set, number"
              className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "" | ListingStatus)}
              className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
            >
              {STATUS_OPTIONS.map((value) => (
                <option key={value || "all"} value={value}>
                  {value ? listingStatusLabel(value) : "All active"}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Set
            </span>
            <input
              value={setCode}
              onChange={(event) => setSetCode(event.target.value)}
              placeholder="e.g. base1"
              className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Rarity
            </span>
            <input
              value={rarity}
              onChange={(event) => setRarity(event.target.value)}
              placeholder="e.g. Rare Holo"
              className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Type
            </span>
            <input
              value={cardType}
              onChange={(event) => setCardType(event.target.value)}
              placeholder="e.g. Fire"
              className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Condition
            </span>
            <input
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              placeholder="e.g. NM"
              className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
            />
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-600 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
            >
              Clear filters
            </button>
          )}
        </aside>

        <div className="space-y-3">
          {loading && (
            <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
              Loading listings...
            </div>
          )}

          {!loading && error && (
            <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
              No listings yet.
            </div>
          )}

          {!loading &&
            !error &&
            listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/market/${listing.id}`}
                className="block rounded border border-neutral-300 bg-white/50 p-4 transition hover:border-neutral-500 dark:border-neutral-800 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{listing.card.name}</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {[
                        listing.card.set_code,
                        listing.card.number,
                        listing.card.rarity,
                        listing.card.card_type,
                      ]
                        .filter(Boolean)
                        .join(" - ") || "Card details pending"}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      Seller: @{listing.seller.username}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatPrice(listing.asking_price)}</div>
                    <div className="text-xs text-neutral-500">
                      {listingStatusLabel(listing.status)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </section>
  );
}
