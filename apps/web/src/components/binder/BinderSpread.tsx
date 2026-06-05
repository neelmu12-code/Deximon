"use client";

import { useState, useEffect } from "react";
import type { CardSlot } from "@/lib/binderTypes";
import { EditablePage } from "./EditablePage";
import { PageSpine } from "./PageSpine";

type Props = {
  pages: CardSlot[][];
  setPages: React.Dispatch<React.SetStateAction<CardSlot[][]>>;
  onAdd: (pageIdx: number, slotIdx: number) => void;
  onCardClick: (card: NonNullable<CardSlot>) => void;
};

export function BinderSpread({ pages, setPages, onAdd, onCardClick }: Props) {
  const [spread, setSpread] = useState(0);
  const [flipping, setFlipping] = useState<"fwd" | "back" | null>(null);
  const [dragSrc, setDragSrc] = useState<{ pageIdx: number; slotIdx: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ pageIdx: number; slotIdx: number } | null>(null);

  useEffect(() => {
    if (!flipping) return;
    const t = setTimeout(() => {
      setSpread((s) => s + (flipping === "fwd" ? 1 : -1));
      setFlipping(null);
    }, 850);
    return () => clearTimeout(t);
  }, [flipping]);

  const totalSpreads = Math.ceil(pages.length / 2);
  const leftPageIdx = spread * 2;
  const rightPageIdx = spread * 2 + 1;
  const leftPage = pages[leftPageIdx] ?? (Array(9).fill(null) as CardSlot[]);
  const rightPage = pages[rightPageIdx] ?? (Array(9).fill(null) as CardSlot[]);

  function onDragStart(pageIdx: number, slotIdx: number) {
    setDragSrc({ pageIdx, slotIdx });
  }
  function onDragOverSlot(pageIdx: number, slotIdx: number) {
    setDragOver({ pageIdx, slotIdx });
  }
  function onDragEnd() {
    setDragSrc(null);
    setDragOver(null);
  }
  function onDrop(targetPage: number, targetSlot: number) {
    if (!dragSrc) return;
    setPages((prev) => {
      const next = prev.map((p) => [...p]);
      // Ensure both pages exist and have 9 slots
      while (next.length <= Math.max(dragSrc.pageIdx, targetPage)) {
        next.push(Array(9).fill(null) as CardSlot[]);
      }
      while (next[dragSrc.pageIdx].length < 9) next[dragSrc.pageIdx].push(null);
      while (next[targetPage].length < 9) next[targetPage].push(null);
      const tmp = next[dragSrc.pageIdx][dragSrc.slotIdx];
      next[dragSrc.pageIdx][dragSrc.slotIdx] = next[targetPage][targetSlot];
      next[targetPage][targetSlot] = tmp;
      return next;
    });
    setDragSrc(null);
    setDragOver(null);
  }
  function onRemove(pageIdx: number, slotIdx: number) {
    setPages((prev) => {
      const next = prev.map((p) => [...p]);
      if (next[pageIdx]) next[pageIdx][slotIdx] = null;
      return next;
    });
  }

  function goForward() {
    if (flipping) return;
    const nextLeftIdx = (spread + 1) * 2;
    setPages((prev) => {
      if (prev.length > nextLeftIdx + 1) return prev;
      const next = [...prev];
      while (next.length <= nextLeftIdx + 1) {
        next.push(Array(9).fill(null) as CardSlot[]);
      }
      return next;
    });
    setFlipping("fwd");
  }
  function goBack() {
    if (flipping || spread === 0) return;
    setFlipping("back");
  }

  const MAX_SPREADS = 10; // 20 pages total
  const canBack = spread > 0 && !flipping;
  const canFwd = !flipping && spread < MAX_SPREADS - 1;

  return (
    <div className="mx-auto" style={{ maxWidth: 1180 }}>
      <div className="relative leather leather-grain rounded-lg p-3 md:p-4">
      <div
        className="relative rounded-md persp"
        style={{ aspectRatio: "15/11", background: "#0c0405" }}
      >
        <div className="absolute inset-3 md:inset-5 grid grid-cols-2 grid-rows-1">
          {/* Left page */}
          <div className="relative h-full">
            <EditablePage
              slots={leftPage}
              pageIdx={leftPageIdx}
              side="left"
              dragSrc={dragSrc}
              dragOver={dragOver}
              onDragStart={onDragStart}
              onDragOver={onDragOverSlot}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              onAdd={onAdd}
              onRemove={onRemove}
              onCardClick={onCardClick}
            />
          </div>
          {/* Right page */}
          <div className="relative h-full">
            <EditablePage
              slots={rightPage}
              pageIdx={rightPageIdx}
              side="right"
              dragSrc={dragSrc}
              dragOver={dragOver}
              onDragStart={onDragStart}
              onDragOver={onDragOverSlot}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              onAdd={onAdd}
              onRemove={onRemove}
              onCardClick={onCardClick}
            />
          </div>
          {/* Spine centered at the seam between pages */}
          <div
            className="absolute top-0 bottom-0 z-10 pointer-events-none"
            style={{ left: "calc(50% - 29px)", width: 58 }}
          >
            <PageSpine />
          </div>
          {/* Flip leaf — only rendered during animation */}
          {flipping && (
            <div
              className={`absolute inset-0 z-20 preserve-3d ${
                flipping === "fwd"
                  ? "flip-origin-left flipping-fwd"
                  : "flip-origin-right flipping-back"
              }`}
            >
              <div className="absolute inset-0 parchment parchment-grain backface-hidden rounded-sm" />
              <div
                className="absolute inset-0 parchment parchment-grain backface-hidden rounded-sm"
                style={{ transform: "rotateY(180deg)" }}
              />
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Nav strip — outside the leather so cover edges are symmetric */}
      <div className="mt-4 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={goBack}
          disabled={!canBack}
          className={`text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 rounded border transition-colors ${
            canBack
              ? "border-white/15 text-white/60 hover:bg-white/5"
              : "border-white/8 text-white/20 cursor-not-allowed"
          }`}
        >
          ← Back
        </button>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: Math.max(totalSpreads, spread + 1) }).map((_, i) => (
            <button
              key={i}
              onClick={() => !flipping && setSpread(i)}
              aria-label={`Go to spread ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === spread ? "bg-white/60 w-5" : "bg-white/20 hover:bg-white/40 w-1.5"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goForward}
          disabled={!canFwd}
          className={`text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 rounded border transition-colors ${
            canFwd
              ? "border-white/15 text-white/60 hover:bg-white/5"
              : "border-white/8 text-white/20 cursor-not-allowed"
          }`}
        >
          Forward →
        </button>
      </div>

      <div className="mt-1 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-white/25">
        Pages {leftPageIdx + 1}–{Math.min(rightPageIdx + 1, pages.length)} of {pages.length}
      </div>
    </div>
  );
}
