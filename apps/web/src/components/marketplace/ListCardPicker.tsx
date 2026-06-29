"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { CardSlot } from "@/lib/binderTypes";
import type { HoloType } from "@/lib/cardDetails";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";

type BackendOwnedCard = {
  id: string;
  name: string;
  set_code: string | null;
  number: string | null;
  rarity: string | null;
  condition: string | null;
  language: string | null;
  holo_type: HoloType;
  image_url: string | null;
};

type BackendBinderResponse = {
  pages: { slots: { card: BackendOwnedCard | null }[] }[];
};

type BackendListing = { card_id: string };

function imageFor(card: BackendOwnedCard): string | null {
  if (card.image_url) return card.image_url;
  if (card.set_code && card.number) {
    return `https://images.pokemontcg.io/${card.set_code}/${card.number.split("/")[0]}.png`;
  }
  return null;
}

function toSlot(card: BackendOwnedCard): NonNullable<CardSlot> {
  return {
    id: card.id,
    name: card.name,
    set: card.set_code ?? "",
    num: card.number ?? "",
    rarity: card.rarity ?? "",
    condition: card.condition,
    language: card.language,
    holo_type: card.holo_type,
    image: imageFor(card) ?? "",
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Could not load your cards.";
}

function PickerThumb({ card }: { card: BackendOwnedCard }) {
  const src = imageFor(card);
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-ink3">
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
      sizes="120px"
      className="object-cover"
      onError={() => setErrored(true)}
    />
  );
}

export function ListCardPicker({
  onPick,
  onClose,
}: {
  onPick: (card: NonNullable<CardSlot>) => void;
  onClose: () => void;
}) {
  const [cards, setCards] = useState<BackendOwnedCard[]>([]);
  const [listedIds, setListedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetchAPI<BackendBinderResponse>("/binder/me", { signal: controller.signal }),
      fetchAPI<BackendListing[]>("/market/listings?limit=50", {
        signal: controller.signal,
      }).catch(() => null),
    ])
      .then(([binder, listings]) => {
        const owned: BackendOwnedCard[] = [];
        for (const page of binder?.pages ?? []) {
          for (const slot of page.slots) {
            if (slot.card) owned.push(slot.card);
          }
        }
        setCards(owned);
        setListedIds(new Set((listings ?? []).map((l) => l.card_id)));
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(errorMessage(loadError));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const available = useMemo(
    () => cards.filter((card) => !listedIds.has(card.id)),
    [cards, listedIds],
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[640px] rounded-xl border border-hair bg-surface shadow-2xl">
        <div className="flex items-start justify-between border-b border-hair p-5">
          <div>
            <div className="mb-0.5 text-[11px] uppercase tracking-[0.18em] text-ink3">
              List a card
            </div>
            <div className="font-semibold text-ink">Pick a card from your collection</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink3 transition-colors hover:text-ink"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {loading && <div className="py-12 text-center text-ink3">Loading your cards…</div>}

          {!loading && error && (
            <div className="rounded-lg border border-[#5a1a1f] bg-[#2a0d10] px-3 py-2 text-sm text-[#ff8a8e]">
              {error}
            </div>
          )}

          {!loading && !error && available.length === 0 && (
            <div className="py-12 text-center text-[13px] text-ink2">
              {cards.length === 0
                ? "You don't have any cards yet — add some to your binder first."
                : "Every card in your collection is already listed."}
            </div>
          )}

          {!loading && !error && available.length > 0 && (
            <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
              {available.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onPick(toSlot(card))}
                  className="rounded-lg border border-hair bg-surface2 p-2 text-left transition-colors hover:border-ink3"
                >
                  <div className="card-ratio relative mb-2 overflow-hidden rounded bg-surface">
                    <PickerThumb card={card} />
                  </div>
                  <div className="truncate text-[12px] font-medium text-ink">{card.name}</div>
                  <div className="font-mono text-[10px] text-ink3">
                    {[card.set_code, card.number].filter(Boolean).join(" · ")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
