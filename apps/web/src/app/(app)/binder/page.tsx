"use client";

import { useAuth } from "@/lib/auth";
import { fetchAPI } from "@/lib/fetchAPI";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BinderSpread } from "@/components/binder/BinderSpread";
import { CardDetailPanel } from "@/components/binder/CardDetailPanel";
import { ConfirmCardModal } from "@/components/binder/ConfirmCardModal";
import { CoverEditorPanel } from "@/components/binder/CoverEditorPanel";
import { CoverThumb } from "@/components/binder/CoverThumb";
import { ManualAddModal } from "@/components/binder/ManualAddModal";
import type { BackendBinderResponse, BinderCoverConfig, CardSlot } from "@/lib/binderTypes";
import { DEFAULT_COVER, mapBackendBinder } from "@/lib/binderTypes";
import {
  defaultDetails,
  type CardDetails,
  type SearchCard,
} from "@/lib/cardDetails";
import { LISTING_PAGE_LIMIT } from "@/lib/marketplace";

const STORAGE_KEYS = {
  pages: "deximon_binder_pages",
  cover: "deximon_binder_cover",
} as const;

type BackendListing = {
  id: string;
  card_id: string;
  asking_price: number | null;
  status: "available" | "on_hold" | "sold" | "cancelled";
};

function listedStatusLabel(status: string): "Available" | "On Hold" | "Sold" {
  if (status === "on_hold") return "On Hold";
  if (status === "sold") return "Sold";
  return "Available";
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

type SlotTarget = { pageIdx: number; slotIdx: number };

function firstEmptySlot(pages: CardSlot[][]): SlotTarget {
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    for (let slotIdx = 0; slotIdx < 9; slotIdx++) {
      if (!pages[pageIdx][slotIdx]) return { pageIdx, slotIdx };
    }
  }
  return { pageIdx: pages.length, slotIdx: 0 };
}

function placeCardAt(
  pages: CardSlot[][],
  target: SlotTarget,
  card: NonNullable<CardSlot>,
): CardSlot[][] {
  const next = pages.map((page) => [...page]);
  while (next.length <= target.pageIdx) next.push([...Array(9)].map(() => null) as CardSlot[]);
  while (next[target.pageIdx].length < 9) next[target.pageIdx].push(null);
  next[target.pageIdx][target.slotIdx] = card;
  return next;
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

    let cancelled = false;
    fetchAPI<BackendBinderResponse>("/binder/me")
      .then(async (binder) => {
        if (!binder || cancelled) return;
        const mapped = mapBackendBinder(binder);
        try {
          // Capped at the 50 newest listings, so a "listed" badge can be missed
          // for a card whose listing has scrolled past that window.
          const listings = await fetchAPI<BackendListing[]>(
            `/market/listings?limit=${LISTING_PAGE_LIMIT}`,
          );
          if (listings && !cancelled) {
            const byCard = new Map<string, NonNullable<CardSlot>["listed"]>();
            for (const listing of listings) {
              byCard.set(listing.card_id, {
                listingId: listing.id,
                price: listing.asking_price ?? 0,
                status: listedStatusLabel(listing.status),
              });
            }
            for (const page of mapped) {
              for (let i = 0; i < page.length; i++) {
                const slot = page[i];
                if (slot && byCard.has(slot.id)) page[i] = { ...slot, listed: byCard.get(slot.id) };
              }
            }
          }
        } catch {
          // Listed badges are best-effort; the binder still renders without them.
        }
        if (!cancelled) setPages(mapped);
      })
      .catch(() => {
        // Keep the localStorage fallback if the user is offline or not authenticated.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [addTarget, setAddTarget] = useState<SlotTarget | null>(null);
  const [pendingCard, setPendingCard] = useState<SearchCard | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
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
    // once the backend adds JSONB columns for binder pages and cover.
  }

  const handleAdd = useCallback((pageIdx: number, slotIdx: number) => {
    setAddTarget({ pageIdx, slotIdx });
    setShowManualAdd(true);
  }, []);

  function handleCardListed({ listingId, price }: { listingId: string; price: number }) {
    const listed = { listingId, price, status: "Available" as const };
    setPages((prev) => {
      const next = prev.map((page) =>
        page.map((slot) => (slot && slot === detailCard ? { ...slot, listed } : slot)),
      );
      localStorage.setItem(STORAGE_KEYS.pages, JSON.stringify(next));
      return next;
    });
    setDetailCard((current) => (current ? { ...current, listed } : current));
  }

  async function handleRemoveDetailCard() {
    if (!detailCard) return;
    const id = detailCard.id;
    // Optimistically clear the slot and close the panel; the backend delete
    // empties the slot via the card_id SET NULL FK, and GET /binder/me is the
    // source of truth on reload.
    setPages((prev) => prev.map((page) => page.map((slot) => (slot && slot.id === id ? null : slot))));
    setDetailCard(null);
    try {
      await fetchAPI(`/binder/cards/${id}`, { method: "DELETE" });
    } catch {
      // Ignore: the local view is already updated.
    }
  }

  // Picking a card from search no longer drops it straight into the binder.
  // It opens the confirm step, which then persists the card to the backend so
  // it survives a refresh (the previous local-only placement did not).
  function handlePick(card: SearchCard) {
    setPendingCard(card);
    setConfirmError(null);
    setShowManualAdd(false);
  }

  async function handleConfirm(details: CardDetails) {
    if (!pendingCard) return;
    setConfirmSaving(true);
    setConfirmError(null);
    try {
      const created = await fetchAPI<{ id: string }>("/binder/cards", {
        method: "POST",
        body: {
          name: pendingCard.name,
          set_code: pendingCard.set || null,
          number: pendingCard.num || null,
          rarity: details.rarity,
          condition: details.condition,
          language: details.language,
          holo_type: details.holo_type,
          image_url: pendingCard.image || null,
          // Create the card unplaced, then assign it to the chosen slot below.
          place_in_binder: false,
        },
      });
      if (!created) throw new Error("Could not save the card.");

      const target = addTarget ?? firstEmptySlot(pages);
      await fetchAPI<BackendBinderResponse>(
        `/binder/pages/${target.pageIdx}/slots/${target.slotIdx}`,
        { method: "PUT", body: { card_id: created.id } },
      );

      const newCard: NonNullable<CardSlot> = {
        id: created.id,
        name: pendingCard.name,
        set: pendingCard.set,
        num: pendingCard.num,
        rarity: details.rarity,
        condition: details.condition,
        language: details.language,
        holo_type: details.holo_type,
        image: pendingCard.image,
      };
      setPages((prev) => placeCardAt(prev, target, newCard));
      setPendingCard(null);
      setAddTarget(null);
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : "Could not save the card.");
    } finally {
      setConfirmSaving(false);
    }
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
      {pendingCard && (
        <ConfirmCardModal
          identity={{
            name: pendingCard.name,
            set_name: pendingCard.set_name,
            set_code: pendingCard.set || null,
            number: pendingCard.num,
            image_url: pendingCard.image || null,
          }}
          initial={defaultDetails({ rarity: pendingCard.rarity })}
          saving={confirmSaving}
          error={confirmError}
          onConfirm={handleConfirm}
          onClose={() => {
            setPendingCard(null);
            setAddTarget(null);
            setConfirmError(null);
          }}
          onSearchAgain={() => {
            setPendingCard(null);
            setConfirmError(null);
            setShowManualAdd(true);
          }}
        />
      )}
      {detailCard && (
        <CardDetailPanel
          card={detailCard}
          onClose={() => setDetailCard(null)}
          onListed={handleCardListed}
          onRemove={handleRemoveDetailCard}
        />
      )}
    </div>
  );
}
