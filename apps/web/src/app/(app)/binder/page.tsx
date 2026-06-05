"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { CardSlot, BinderCoverConfig } from "@/lib/binderTypes";
import { DEFAULT_COVER } from "@/lib/binderTypes";
import { BinderSpread } from "@/components/binder/BinderSpread";
import { CoverEditorPanel } from "@/components/binder/CoverEditorPanel";
import { ManualAddModal } from "@/components/binder/ManualAddModal";
import { CardDetailPanel } from "@/components/binder/CardDetailPanel";
import { CoverThumb } from "@/components/binder/CoverThumb";

const STORAGE_KEYS = {
  pages: "deximon_binder_pages",
  cover: "deximon_binder_cover",
} as const;

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function BinderPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [pages, setPages] = useState<CardSlot[][]>(
    () => [[...Array(9)].map(() => null) as CardSlot[]]
  );
  const [cover, setCover] = useState<BinderCoverConfig>(DEFAULT_COVER);

  useEffect(() => {
    setPages(loadFromStorage(STORAGE_KEYS.pages, [[...Array(9)].map(() => null) as CardSlot[]]));
    setCover(loadFromStorage(STORAGE_KEYS.cover, DEFAULT_COVER));
  }, []);

  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [addTarget, setAddTarget] = useState<{ pageIdx: number; slotIdx: number } | null>(null);
  const [detailCard, setDetailCard] = useState<NonNullable<CardSlot> | null>(null);
  const [saved, setSaved] = useState(false);

  const cardCount = pages.flat().filter(Boolean).length;
  const pageCount = pages.length;

  function handleSave() {
    localStorage.setItem(STORAGE_KEYS.pages, JSON.stringify(pages));
    localStorage.setItem(STORAGE_KEYS.cover, JSON.stringify(cover));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // TODO (backend): replace with PATCH /profiles/me { binder_pages, binder_cover }
    // once the backend adds those JSONB columns. The JSONB design is in the deferred
    // items section of the implementation plan — it's a ~30-line backend change.
  }

  const handleAdd = useCallback((pageIdx: number, slotIdx: number) => {
    setAddTarget({ pageIdx, slotIdx });
    setShowManualAdd(true);
  }, []);

  function handlePick(card: NonNullable<CardSlot>) {
    setPages((prev) => {
      const next = prev.map((p) => [...p]);
      if (addTarget) {
        while (next.length <= addTarget.pageIdx) {
          next.push([...Array(9)].map(() => null) as CardSlot[]);
        }
        while (next[addTarget.pageIdx].length < 9) next[addTarget.pageIdx].push(null);
        next[addTarget.pageIdx][addTarget.slotIdx] = card;
      } else {
        // Find first empty slot across all pages
        let placed = false;
        for (let pi = 0; pi < next.length && !placed; pi++) {
          for (let si = 0; si < 9 && !placed; si++) {
            if (!next[pi][si]) {
              next[pi][si] = card;
              placed = true;
            }
          }
        }
        if (!placed) {
          next.push([card, ...[...Array(8)].map(() => null)] as CardSlot[]);
        }
      }
      return next;
    });
    setShowManualAdd(false);
    setAddTarget(null);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">My Binder</h1>
          <div className="text-[12px] text-ink3 mt-0.5">
            {cardCount} card{cardCount !== 1 ? "s" : ""} · {pageCount} page{pageCount !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => router.push("/binder/scan")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hair bg-surface2 text-sm text-ink2 hover:text-ink hover:border-ink3 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            Scan card
          </button>
          <button
            type="button"
            onClick={() => setShowManualAdd(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hair bg-surface2 text-sm text-ink2 hover:text-ink hover:border-ink3 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add manually
          </button>
          <button
            type="button"
            onClick={() => setShowCoverEditor(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-hair bg-surface2 text-sm text-ink2 hover:text-ink hover:border-ink3 transition-colors"
          >
            <CoverThumb cfg={cover} size={20} username={user?.username ?? ""} />
            Edit cover
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all ${
              saved ? "bg-dx-green" : "bg-dx-red hover:bg-dx-red-hover"
            }`}
          >
            {saved ? "Saved ✓" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Tip bar */}
      <div className="bg-surface border border-hair rounded-lg px-4 py-2.5 mb-5 text-[12px] text-ink3">
        ✦ Drag cards between slots to reorder. Click + in an empty slot to add. Hover a card and click × to remove.
      </div>

      {/* Binder spread */}
      <BinderSpread
        pages={pages}
        setPages={setPages}
        onAdd={handleAdd}
        onCardClick={setDetailCard}
      />

      {showCoverEditor && (
        <CoverEditorPanel
          cover={cover}
          setCover={setCover}
          username={user?.username ?? ""}
          onClose={() => setShowCoverEditor(false)}
        />
      )}
      {showManualAdd && (
        <ManualAddModal
          onPick={handlePick}
          onClose={() => {
            setShowManualAdd(false);
            setAddTarget(null);
          }}
        />
      )}
      {detailCard && (
        <CardDetailPanel
          card={detailCard}
          onClose={() => setDetailCard(null)}
        />
      )}
    </div>
  );
}
