"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { SearchCard } from "@/lib/cardDetails";
import { fetchAPI } from "@/lib/fetchAPI";

type Props = {
  onPick: (card: SearchCard) => void;
  onClose: () => void;
};

// Results per page.
const PAGE_SIZE = 24;

export function ManualAddModal({ onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [debounced, setDebounced] = useState("");
  // Cancels an in-flight page fetch when a new search starts.
  const moreControllerRef = useRef<AbortController | null>(null);
  // Stops the observer starting a second fetch mid-flight.
  const loadingMoreRef = useRef(false);
  // Points at the current loadMore so the observer never uses a stale one.
  const loadMoreRef = useRef<() => void>(() => {});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch the first page when the query changes.
  useEffect(() => {
    moreControllerRef.current?.abort();
    if (!debounced.trim()) {
      setResults([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchAPI<SearchCard[]>(
      `/cards/search?q=${encodeURIComponent(debounced)}&limit=${PAGE_SIZE}&offset=0`,
      { signal: controller.signal },
    )
      .then((data) => {
        const rows = data ?? [];
        setResults(rows);
        setHasMore(rows.length === PAGE_SIZE);
      })
      .catch((err: unknown) => {
        if (!(err instanceof Error && err.name === "AbortError")) {
          setResults([]);
          setHasMore(false);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debounced]);

  async function loadMore() {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    const controller = new AbortController();
    moreControllerRef.current = controller;
    setLoadingMore(true);
    try {
      const data = await fetchAPI<SearchCard[]>(
        `/cards/search?q=${encodeURIComponent(debounced)}&limit=${PAGE_SIZE}&offset=${results.length}`,
        { signal: controller.signal },
      );
      const rows = data ?? [];
      setResults((prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err: unknown) {
      // Keep existing results on error.
      if (err instanceof Error && err.name === "AbortError") return;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  // Keep loadMoreRef current.
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  // Load the next page when the bottom sentinel scrolls into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreRef.current();
      },
      { root: scrollRef.current, rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[720px] max-h-[80vh] bg-surface border border-hair rounded-xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-hair">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink3 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.197 5.197a7.5 7.5 0 0 0 10.606 10.606Z" />
            </svg>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards by name, set, or number…"
              className="w-full bg-surface2 border border-hair rounded-lg pl-9 pr-3 py-2 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:border-ink3"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink3 hover:text-ink transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-hair border-t-dx-red animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <svg
                className="w-10 h-10 text-ink3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.197 5.197a7.5 7.5 0 0 0 10.606 10.606Z" />
              </svg>
              <p className="text-sm text-ink3">
                {debounced.trim() ? "No cards found." : "Search for a card to add it to your binder."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {results.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onPick(card)}
                    className="group text-left"
                  >
                    <div className="card-ratio relative rounded-md overflow-hidden mb-1 group-hover:ring-2 ring-dx-red transition-all">
                      <Image src={card.image} alt={card.name} fill className="object-cover" sizes="100px" unoptimized />
                    </div>
                    <div className="text-[11px] text-ink truncate">{card.name}</div>
                    <div className="text-[10px] text-ink3 font-mono">{card.set}</div>
                  </button>
                ))}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-5">
                  {loadingMore && (
                    <span className="w-5 h-5 rounded-full border-2 border-hair border-t-dx-red animate-spin" />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
