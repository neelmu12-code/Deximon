"use client";

import Image from "next/image";
import { useState } from "react";

type CardSlot = {
  name: string;
  set: string;
  num: string;
  rarity: string;
  image: string;
  listed?: { price: number; status: "Available" | "On Hold" | "Sold" };
} | null;

const PAGES: CardSlot[][] = [
  // Page 1 — full Base Set holo run
  [
    { name: "Charizard",  set: "Base Set", num: "4/102",  rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/4.png",  listed: { price: 124.00, status: "Available" } },
    { name: "Blastoise",  set: "Base Set", num: "2/102",  rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/2.png",  listed: { price: 88.00,  status: "Available" } },
    { name: "Venusaur",   set: "Base Set", num: "15/102", rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/15.png" },
    { name: "Mewtwo",     set: "Base Set", num: "10/102", rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/10.png", listed: { price: 96.50,  status: "Available" } },
    { name: "Gyarados",   set: "Base Set", num: "6/102",  rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/6.png",  listed: { price: 43.00,  status: "On Hold"   } },
    { name: "Alakazam",   set: "Base Set", num: "1/102",  rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/1.png"  },
    { name: "Raichu",     set: "Base Set", num: "14/102", rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/14.png" },
    { name: "Machamp",    set: "Base Set", num: "8/102",  rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/8.png"  },
    { name: "Nidoking",   set: "Base Set", num: "11/102", rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/11.png" },
  ],
  // Page 2 — remaining holos, two slots still open
  [
    { name: "Zapdos",     set: "Base Set", num: "16/102", rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/16.png" },
    { name: "Ninetales",  set: "Base Set", num: "12/102", rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/12.png" },
    { name: "Clefairy",   set: "Base Set", num: "5/102",  rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/5.png"  },
    { name: "Chansey",    set: "Base Set", num: "3/102",  rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/3.png"  },
    { name: "Hitmonchan", set: "Base Set", num: "7/102",  rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/7.png"  },
    { name: "Magneton",   set: "Base Set", num: "9/102",  rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/9.png"  },
    { name: "Poliwrath",  set: "Base Set", num: "13/102", rarity: "Holo Rare", image: "https://images.pokemontcg.io/base1/13.png" },
    null,
    null,
  ],
  // Page 3 — still hunting
  [
    { name: "Pikachu",    set: "Base Set", num: "58/102", rarity: "Common",    image: "https://images.pokemontcg.io/base1/58.png" },
    null, null, null, null, null, null, null, null,
  ],
];

export function BinderPreview() {
  const [pageIdx, setPageIdx] = useState(0);
  const currentPage = PAGES[pageIdx];

  return (
    <div>
      {/* section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-[11px] uppercase tracking-[0.22em] text-ink3">The Binder</div>
        <div className="flex-1 h-px bg-hair" />
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11px] font-medium tracking-wide bg-ink/10 text-ink border-ink/20">
          <span className="w-1.5 h-1.5 rounded-full bg-ink inline-block" />
          Public
        </span>
      </div>

      {/* binder container */}
      <div
        className="rounded-xl border border-[#2E2018]"
        style={{ background: "linear-gradient(180deg, #181210 0%, #120D09 100%)" }}
      >
        {/* card grid */}
        <div className="p-5 md:p-7">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {currentPage.map((slot, i) =>
              slot ? (
                <div key={i} className="relative group">
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
                    {/* plastic sleeve sheen */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/15 pointer-events-none" />
                  </div>

                  {/* tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 whitespace-nowrap">
                    <div className="bg-base/95 border border-hair rounded-md px-2.5 py-1.5 text-[11px] shadow-xl">
                      <div className="font-semibold text-ink">{slot.name}</div>
                      <div className="text-ink3 font-mono text-[10px]">
                        {slot.set} · {slot.num} · {slot.rarity}
                      </div>
                      {slot.listed && (
                        <div
                          className={`font-bold tabular-nums text-[11px] mt-0.5 ${
                            slot.listed.status === "Available"
                              ? "text-dx-green"
                              : slot.listed.status === "On Hold"
                              ? "text-dx-gold"
                              : "text-ink3"
                          }`}
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

        {/* navigation strip */}
        <div className="border-t border-[#2E2018] px-5 md:px-7 py-3 flex items-center justify-between">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/30">
            Page {pageIdx + 1} of {PAGES.length}
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
              {PAGES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPageIdx(i)}
                  aria-label={`Go to page ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === pageIdx
                      ? "bg-white/70 w-5"
                      : "bg-white/20 hover:bg-white/40 w-1.5"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setPageIdx((p) => Math.min(PAGES.length - 1, p + 1))}
              disabled={pageIdx === PAGES.length - 1}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] uppercase tracking-[0.15em] border transition-colors ${
                pageIdx === PAGES.length - 1
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
