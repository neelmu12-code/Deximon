import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { CardSlot } from "@/lib/binderTypes";
import { conditionLabel, languageLabel } from "@/lib/cardDetails";
import { ListCardModal } from "./ListCardModal";

type Props = {
  card: NonNullable<CardSlot>;
  onClose: () => void;
  onListed: (result: { listingId: string; price: number }) => void;
  onRemove: () => void;
};

function ComingSoonButton({ label, variant }: { label: string; variant: "primary" | "ghost" | "danger" }) {
  const base = "relative group w-full py-2.5 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed";
  const styles = {
    primary: `${base} bg-dx-red text-white`,
    ghost: `${base} border border-hair text-ink2`,
    danger: `${base} border border-hair text-red-400`,
  };
  return (
    <div className="relative group">
      <button type="button" disabled className={styles[variant]}>
        {label}
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-base border border-hair rounded text-[11px] text-ink3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Coming soon
      </div>
    </div>
  );
}

export function CardDetailPanel({ card, onClose, onListed, onRemove }: Props) {
  const [showListModal, setShowListModal] = useState(false);

  const conditionDisplay = conditionLabel(card.condition);
  const languageDisplay = languageLabel(card.language);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="absolute right-0 inset-y-0 w-[440px] bg-base border-l border-hair overflow-y-auto flex flex-col"
        style={{ animation: "slideIn 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-hair">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink3 mb-0.5">Card detail</div>
            <div className="font-semibold text-ink">{card.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink3 hover:text-ink transition-colors mt-0.5"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Card image */}
          <div className="flex justify-center">
            <div className="relative w-[280px] card-ratio rounded-lg overflow-hidden shadow-2xl">
              <Image src={card.image} alt={card.name} fill className="object-cover" sizes="280px" unoptimized />
            </div>
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-surface2 border border-hair text-[12px] text-ink2 font-mono">
              {card.set} · {card.num}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-surface2 border border-hair text-[12px] text-ink2">
              {card.rarity}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-hair rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink3 mb-1">Condition</div>
              <div className="text-sm text-ink">{conditionDisplay}</div>
            </div>
            <div className="bg-surface border border-hair rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink3 mb-1">Language</div>
              <div className="text-sm text-ink">{languageDisplay}</div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-surface border border-hair rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink3 mb-1">Notes</div>
            <p className="text-sm text-ink3">No notes added yet.</p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {card.listed ? (
              <>
                {card.listed.listingId ? (
                  <Link
                    href={`/market/${card.listed.listingId}`}
                    className="block w-full py-2.5 rounded-lg text-sm font-medium bg-dx-red text-white text-center hover:bg-dx-red-hover transition-colors"
                  >
                    View listing
                  </Link>
                ) : (
                  <ComingSoonButton label="Edit listing" variant="primary" />
                )}
                <ComingSoonButton label="Unlist" variant="ghost" />
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowListModal(true)}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-dx-red text-white hover:bg-dx-red-hover transition-colors"
                >
                  List this card
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="w-full py-2.5 rounded-lg border border-hair text-sm font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showListModal && (
        <ListCardModal
          card={card}
          onClose={() => setShowListModal(false)}
          onListed={onListed}
        />
      )}
    </div>
  );
}
