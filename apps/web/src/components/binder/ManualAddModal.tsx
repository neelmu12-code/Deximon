"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { CardSlot } from "@/lib/binderTypes";
import { fetchAPI } from "@/lib/fetchAPI";

type Props = {
  onPick: (card: NonNullable<CardSlot>) => void;
  onClose: () => void;
};

export function ManualAddModal({ onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NonNullable<CardSlot>[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchAPI<NonNullable<CardSlot>[]>(
      `/cards/search?q=${encodeURIComponent(debounced)}&limit=24`,
      { signal: controller.signal },
    )
      .then((data) => setResults(data ?? []))
      .catch((err: unknown) => {
        if (!(err instanceof Error && err.name === "AbortError")) setResults([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debounced]);

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
        <div className="flex-1 overflow-y-auto p-4">
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
          )}
        </div>
      </div>
    </div>
  );
}
