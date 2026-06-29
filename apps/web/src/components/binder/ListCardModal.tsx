"use client";

import Link from "next/link";
import { useState } from "react";
import type { CardSlot } from "@/lib/binderTypes";
import {
  CONDITION_OPTIONS,
  HOLO_OPTIONS,
  languageLabel,
} from "@/lib/cardDetails";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";

function conditionLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return CONDITION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function holoLabel(value: string | null | undefined): string {
  return HOLO_OPTIONS.find((o) => o.value === (value ?? "normal"))?.label ?? "Normal";
}

// The binder is currently localStorage-backed, so a binder card has no row in the
// `cards` table yet. To create a real listing we first persist the card via
// POST /binder/cards (Collection backend), then POST /market/listings with the
// returned owned-card id. We pass place_in_binder: false so this listing-only card
// does not get auto-placed into a backend binder slot the localStorage binder can't
// see. Once the binder is wired to the backend, the create-card step here can be
// dropped in favour of the existing owned-card id.
type OwnedCard = { id: string };
type CreatedListing = { id: string };

type Props = {
  card: NonNullable<CardSlot>;
  onClose: () => void;
  onListed: (result: { listingId: string; price: number }) => void;
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Could not create the listing.";
}

export function ListCardModal({ card, onClose, onListed }: Props) {
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedListing | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const owned = await fetchAPI<OwnedCard>("/binder/cards", {
        method: "POST",
        body: {
          name: card.name,
          set_code: card.set || null,
          number: card.num || null,
          rarity: card.rarity || null,
          condition: card.condition || null,
          language: card.language || null,
          holo_type: card.holo_type || "normal",
          image_url: card.image?.startsWith("http") ? card.image : null,
          place_in_binder: false,
        },
      });
      if (!owned) throw new Error("Card could not be saved.");

      const trimmedPrice = price.trim();
      const listing = await fetchAPI<CreatedListing>("/market/listings", {
        method: "POST",
        body: {
          card_id: owned.id,
          asking_price: trimmedPrice === "" ? null : trimmedPrice,
          notes: notes.trim() === "" ? null : notes.trim(),
        },
      });
      if (!listing) throw new Error("Listing could not be created.");

      setCreated(listing);
      onListed({ listingId: listing.id, price: trimmedPrice === "" ? 0 : Number(trimmedPrice) });
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[420px] bg-surface border border-hair rounded-xl shadow-2xl">
        <div className="flex items-start justify-between p-5 border-b border-hair">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink3 mb-0.5">
              {created ? "Listed" : "List this card"}
            </div>
            <div className="font-semibold text-ink">{card.name}</div>
            <div className="text-[11px] text-ink3 font-mono mt-0.5">
              {[card.set, card.num, card.rarity].filter(Boolean).join(" · ")}
            </div>
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

        {created ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-ink2">
              Your card is now live in the marketplace. You can manage its status from the
              listing page.
            </p>
            <div className="flex gap-2">
              <Link
                href={`/market/${created.id}`}
                className="flex-1 text-center rounded-lg bg-dx-red px-4 py-2.5 text-sm font-medium text-white hover:bg-dx-red-hover transition-colors"
              >
                View listing
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-hair px-4 py-2.5 text-sm text-ink2 hover:text-ink transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="rounded-lg border border-hair bg-surface2 px-3 py-2.5">
              <div className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-ink3">
                Card details
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink2">
                <span>
                  Condition: <span className="text-ink">{conditionLabel(card.condition)}</span>
                </span>
                <span>
                  Language: <span className="text-ink">{languageLabel(card.language ?? "EN")}</span>
                </span>
                <span>
                  Holo: <span className="text-ink">{holoLabel(card.holo_type)}</span>
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-ink3">
                Carried over from your binder card details.
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase tracking-[0.18em] text-ink3">
                Asking price (USD)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Leave blank for trade-only"
                className="w-full rounded-lg bg-surface2 border border-hair px-3 py-2 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:border-ink3"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase tracking-[0.18em] text-ink3">Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Condition, trade preferences, etc."
                className="w-full resize-none rounded-lg bg-surface2 border border-hair px-3 py-2 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:border-ink3"
              />
            </label>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-lg bg-dx-red px-4 py-2.5 text-sm font-medium text-white hover:bg-dx-red-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Listing…" : "List on marketplace"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
