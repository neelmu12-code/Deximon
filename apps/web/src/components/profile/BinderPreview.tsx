"use client";

import Image from "next/image";
import { useState } from "react";
import { COVER_COLORS, DEFAULT_COVER, type BinderCoverConfig } from "@/lib/binderTypes";
import type { HoloType } from "@/lib/cardDetails";

// Binder teammate: replace `pages` prop with data fetched from the binder API.
// Each inner array is one page (9 slots). A null slot renders as an empty pocket.
// The server component at app/(app)/u/[username]/page.tsx owns the fetch —
// call GET /binder/{username}/pages (or equivalent) there and pass the result down.
export type CardSlot = {
  id: string;
  name: string;
  set: string;
  num: string;
  rarity: string;
  image: string;
  condition?: string | null;
  language?: string | null;
  holo_type?: HoloType | null;
  listed?: { listingId?: string; price: number; status: "Available" | "On Hold" | "Sold" };
} | null;

type Props = {
  pages?: CardSlot[][];
  binderIsPublic?: boolean;
  cover?: BinderCoverConfig | null;
  username?: string;
};

const STATUS_COLORS = {
  Available: "text-dx-green",
  "On Hold": "text-dx-gold",
  Sold: "text-ink3",
} as const;

// Persistent status dot shown on the top-right of a card that's on the market.
const STATUS_DOT = {
  Available: "bg-dx-green",
  "On Hold": "bg-dx-gold",
  Sold: "bg-ink3",
} as const;

function coverBackground(cfg: BinderCoverConfig): string {
  const color = COVER_COLORS.find((c) => c.id === cfg.colorId) ?? COVER_COLORS[0];
  const gradient = `linear-gradient(160deg, ${color.a} 0%, ${color.b} 55%, ${color.c} 100%)`;
  if (cfg.type === "image" && cfg.imageUrl) return `url(${cfg.imageUrl}) center/cover`;
  return gradient;
}

export function BinderPreview({ pages = [], binderIsPublic = true, cover, username }: Props) {
  const [open, setOpen] = useState(false);
  const [pageIdx, setPageIdx] = useState(0);
  const coverCfg = cover ?? DEFAULT_COVER;

  const visibilityChip = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11px] font-medium tracking-wide ${
        binderIsPublic
          ? "bg-ink/10 text-ink border-ink/20"
          : "bg-surface2 text-ink3 border-hair"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full inline-block ${binderIsPublic ? "bg-ink" : "bg-ink3"}`}
      />
      {binderIsPublic ? "Public" : "Private"}
    </span>
  );

  const header = (right?: React.ReactNode) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-[11px] uppercase tracking-[0.22em] text-ink3">The Binder</div>
      <div className="flex-1 h-px bg-hair" />
      {right}
      {visibilityChip}
    </div>
  );

  // Private binder — never reveals contents.
  if (!binderIsPublic) {
    return (
      <div>
        {header()}
        <div
          className="rounded-xl border border-[#2E2018] flex items-center justify-center py-20"
          style={{ background: "linear-gradient(180deg, #181210 0%, #120D09 100%)" }}
        >
          <div className="text-center space-y-2">
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 text-white/20 mx-auto"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="11" width="14" height="9" rx="1.5" />
              <path d="M8 11V8a4 4 0 1 1 8 0v3" />
            </svg>
            <p className="text-white/30 text-sm">This binder is private.</p>
          </div>
        </div>
      </div>
    );
  }

  // Closed cover — the default view on someone's profile. Click to open.
  if (!open) {
    return (
      <div>
        {header()}
        <div
          className="rounded-xl border border-[#2E2018] flex items-center justify-center py-10 md:py-14"
          style={{ background: "linear-gradient(180deg, #181210 0%, #120D09 100%)" }}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open binder"
            className="group relative block"
          >
            {/* Closed book cover */}
            <div
              className="relative w-[240px] md:w-[280px] aspect-[3/4] rounded-r-xl rounded-l-sm overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[0.4deg]"
              style={{
                background: coverBackground(coverCfg),
                boxShadow:
                  "0 20px 50px rgba(0,0,0,0.6), 0 6px 14px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.35)",
              }}
            >
              {/* Spine */}
              <div
                className="absolute inset-y-0 left-0 w-4"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, rgba(255,255,255,0.05) 100%)",
                }}
              />
              {/* Inner border emboss */}
              <div className="absolute inset-3 rounded-md border border-white/10" />
              {/* Sheen */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/25 pointer-events-none" />
              {/* Embossed name */}
              {coverCfg.showName && username && (
                <div className="absolute inset-x-0 bottom-8 text-center px-4">
                  <div className="script gold-foil text-2xl md:text-3xl leading-tight truncate">
                    {username}&apos;s
                  </div>
                  <div className="script gold-foil text-sm md:text-base opacity-80">binder</div>
                </div>
              )}
            </div>

            {/* Open hint */}
            <div className="mt-4 text-center text-[11px] uppercase tracking-[0.2em] text-white/40 group-hover:text-white/70 transition-colors">
              Click to open
            </div>
          </button>
        </div>
      </div>
    );
  }

  const closeButton = (
    <button
      type="button"
      onClick={() => setOpen(false)}
      className="inline-flex items-center gap-1.5 rounded-md border border-hair px-2.5 py-1 text-[11px] text-ink2 hover:text-ink hover:bg-surface2 transition-colors"
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3 10 8l-5 5" />
      </svg>
      Close
    </button>
  );

  // Opened, but no cards yet.
  if (pages.length === 0) {
    return (
      <div>
        {header(closeButton)}
        <div
          className="rounded-xl border border-[#2E2018] flex items-center justify-center py-20"
          style={{ background: "linear-gradient(180deg, #181210 0%, #120D09 100%)" }}
        >
          <div className="text-center space-y-2">
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 text-white/20 mx-auto"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <p className="text-white/30 text-sm">No cards in this binder yet.</p>
          </div>
        </div>
      </div>
    );
  }

  // Opened, with cards.
  const currentPage = pages[pageIdx] ?? [];

  return (
    <div>
      {header(closeButton)}

      <div
        className="rounded-xl border border-[#2E2018]"
        style={{ background: "linear-gradient(180deg, #181210 0%, #120D09 100%)" }}
      >
        <div className="p-5 md:p-7">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {currentPage.map((slot, i) =>
              slot ? (
                <div key={slot.id} className="relative group">
                  <div
                    className="relative aspect-[5/7] rounded-lg overflow-hidden transition-transform duration-200 group-hover:-translate-y-1.5"
                    style={{ boxShadow: "0 6px 16px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.4)" }}
                  >
                    <Image
                      src={slot.image}
                      alt={slot.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1280px) 25vw, 300px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/15 pointer-events-none" />
                    {/* Marketplace status dot */}
                    {slot.listed && (
                      <span
                        className={`absolute top-1.5 right-1.5 w-3 h-3 rounded-full ring-2 ring-black/50 ${STATUS_DOT[slot.listed.status]}`}
                      />
                    )}
                  </div>

                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 whitespace-nowrap">
                    <div className="bg-base/95 border border-hair rounded-md px-2.5 py-1.5 text-[11px] shadow-xl">
                      <div className="font-semibold text-ink">{slot.name}</div>
                      <div className="text-ink3 font-mono text-[10px]">
                        {slot.set} · {slot.num} · {slot.rarity}
                      </div>
                      {slot.listed && (
                        <div
                          className={`font-bold tabular-nums text-[11px] mt-0.5 ${STATUS_COLORS[slot.listed.status]}`}
                        >
                          ${slot.listed.price.toFixed(2)} · {slot.listed.status}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className="aspect-[5/7] rounded-lg"
                  style={{
                    border: "1px dashed rgba(120,90,40,0.3)",
                    background: "rgba(120,90,40,0.03)",
                  }}
                />
              )
            )}
          </div>
        </div>

        <div className="border-t border-[#2E2018] px-5 md:px-7 py-3 flex items-center justify-between">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/30">
            Page {pageIdx + 1} of {pages.length}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
              disabled={pageIdx === 0}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] uppercase tracking-[0.15em] border transition-colors ${
                pageIdx === 0
                  ? "border-white/10 text-white/25 cursor-not-allowed"
                  : "border-white/15 text-white/60 hover:bg-white/5"
              }`}
            >
              ← Back
            </button>

            <div className="flex items-center gap-1.5">
              {pages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPageIdx(i)}
                  aria-label={`Go to page ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === pageIdx ? "bg-white/70 w-5" : "bg-white/20 hover:bg-white/40 w-1.5"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setPageIdx((p) => Math.min(pages.length - 1, p + 1))}
              disabled={pageIdx === pages.length - 1}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] uppercase tracking-[0.15em] border transition-colors ${
                pageIdx === pages.length - 1
                  ? "border-white/10 text-white/25 cursor-not-allowed"
                  : "border-white/15 text-white/60 hover:bg-white/5"
              }`}
            >
              Forward →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
