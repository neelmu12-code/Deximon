"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Chip,
  StatusPill,
  TonePill,
  rarityTone,
  typeTone,
} from "@/components/marketplace/chips";
import { Stars } from "@/components/ui/Stars";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth } from "@/lib/auth";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import {
  conditionLabel,
  formatPrice,
  holoLabel,
  languageLabel,
  listingImageUrl,
  listingStatusLabel,
  type Conversation,
  type Listing,
  type ListingCard,
  type ListingStatus,
} from "@/lib/marketplace";

const STATUS_OPTIONS: ListingStatus[] = ["available", "on_hold", "sold", "cancelled"];

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

function CardArt({ card }: { card: ListingCard }) {
  const src = listingImageUrl(card);
  const [errored, setErrored] = useState(false);
  const isHolo = card.holo_type !== "normal";

  return (
    <div
      className="card-ratio relative overflow-hidden rounded-xl border border-hair bg-surface2"
      style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.4)" }}
    >
      {src && !errored ? (
        <Image
          src={src}
          alt={card.name}
          fill
          unoptimized
          sizes="(max-width: 1024px) 100vw, 360px"
          className="object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-ink3">
          {card.name}
        </div>
      )}
      {isHolo && <div className="sleeve-sheen pointer-events-none absolute inset-0" />}
    </div>
  );
}

function InboxIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 8.5h3l1 2h5l1-2h3" />
      <path d="M2.5 8.5 4 3h8l1.5 5.5v4a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function ListingDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [others, setOthers] = useState<Listing[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ListingStatus>("available");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchAPI<Listing>(`/market/listings/${id}`, { signal: controller.signal })
      .then((data) => {
        if (data) {
          setListing(data);
          setSelectedStatus(data.status);
        }
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(errorMessage(loadError));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!listing) return;
    const controller = new AbortController();
    fetchAPI<Listing[]>("/market/listings?limit=50", { signal: controller.signal })
      .then((data) => {
        const sellerListings = (data ?? []).filter(
          (l) => l.seller_id === listing.seller_id && l.id !== listing.id,
        );
        setOthers(sellerListings.slice(0, 5));
      })
      .catch(() => setOthers([]));
    return () => controller.abort();
  }, [listing]);

  const isSeller = Boolean(user && listing && user.id === listing.seller_id);

  async function openChat() {
    if (!listing) return;
    setOpeningChat(true);
    setError(null);
    try {
      const conversation = await fetchAPI<Conversation>("/conversations", {
        method: "POST",
        body: { listing_id: listing.id },
      });
      if (!conversation) throw new Error("Conversation was not returned.");
      router.push(`/inbox/${conversation.id}`);
    } catch (chatError) {
      setError(errorMessage(chatError));
    } finally {
      setOpeningChat(false);
    }
  }

  async function updateStatus() {
    if (!listing) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await fetchAPI<Listing>(`/market/listings/${listing.id}`, {
        method: "PATCH",
        body: { status: selectedStatus },
      });
      if (!updated) throw new Error("Listing update did not return a listing.");
      setListing(updated);
      setMessage("Listing status updated.");
    } catch (statusError) {
      setError(errorMessage(statusError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="rounded-xl border border-hair bg-surface p-12 text-center text-ink3">
          Loading listing…
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="rounded-xl border border-hair bg-surface p-12 text-center text-ink2">
          {error ?? "Listing not found."}
        </div>
      </div>
    );
  }

  const card = listing.card;
  const reviews = listing.seller.review_count ?? 0;

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <Link
        href="/market"
        className="mb-4 inline-flex items-center gap-1 text-[12px] text-ink2 hover:text-ink"
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="7.5,2.5 4,6 7.5,9.5" />
        </svg>
        Back to marketplace
      </Link>

      {error && (
        <div className="mb-4 rounded-lg border border-[#5a1a1f] bg-[#2a0d10] p-4 text-sm text-[#ff8a8e]">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border border-[#1c4a33] bg-[#0f2a1d] p-4 text-sm text-[#8bdcae]">
          {message}
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* Card image */}
        <div className="col-span-12 lg:col-span-5">
          <div className="mx-auto max-w-[360px]">
            <CardArt card={card} />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {(card.set_code || card.number) && (
              <Chip className="font-mono">
                {[card.set_code, card.number].filter(Boolean).join(" · ")}
              </Chip>
            )}
            {card.rarity && <TonePill tone={rarityTone(card.rarity)}>{card.rarity}</TonePill>}
            {card.card_type && <TonePill tone={typeTone(card.card_type)}>{card.card_type}</TonePill>}
            {card.holo_type === "holo" && <TonePill tone="blue">Holo</TonePill>}
            {card.holo_type === "reverse_holo" && <TonePill tone="blue">Reverse Holo</TonePill>}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 space-y-6 lg:col-span-7">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-ink3">Listing</div>
            <h1 className="text-4xl font-bold tracking-tight">{card.name}</h1>
            <div className="mt-1 text-ink2">
              {[card.set_code, card.number, card.rarity].filter(Boolean).join(" · ") ||
                "Card details pending"}
            </div>
          </div>

          {/* Price + status */}
          <div className="rounded-xl border border-hair bg-surface p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-ink3">Asking</div>
                <div className="mt-1 text-5xl font-extrabold leading-none tabular-nums text-dx-red">
                  {formatPrice(listing.asking_price)}
                </div>
                <div className="mt-2 text-[12px] text-ink3">
                  Listed {timeAgo(listing.created_at)} ago
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusPill status={listing.status} />
                {isSeller ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStatus}
                      onChange={(event) => setSelectedStatus(event.target.value as ListingStatus)}
                      className="h-9 rounded-md border border-hair bg-surface2 px-2 text-[13px] text-ink outline-none focus:border-ink3"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {listingStatusLabel(option)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={updateStatus}
                      disabled={saving || selectedStatus === listing.status}
                      className="inline-flex h-9 items-center rounded-md bg-dx-red px-4 text-[13px] font-medium text-white transition-colors hover:bg-dx-red-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Update"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openChat}
                    disabled={!user || openingChat}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-dx-red px-5 text-sm font-medium text-white transition-colors hover:bg-dx-red-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <InboxIcon />
                    {!user ? "Log in to chat" : openingChat ? "Opening…" : "Open chat"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-hair bg-surface2 px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wider text-ink3">Condition</div>
                <div className="mt-1 font-medium">
                  {card.condition ? `${card.condition} · ${conditionLabel(card.condition)}` : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-hair bg-surface2 px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wider text-ink3">Language</div>
                <div className="mt-1 font-medium">{languageLabel(card.language)}</div>
              </div>
              <div className="rounded-lg border border-hair bg-surface2 px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wider text-ink3">Holo</div>
                <div className="mt-1 font-medium">{holoLabel(card.holo_type)}</div>
              </div>
            </div>
          </div>

          {/* Seller */}
          <div className="rounded-xl border border-hair bg-surface p-5">
            <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-ink3">Seller</div>
            <div className="flex items-center gap-3">
              <UserAvatar
                username={listing.seller.username}
                displayName={listing.seller.display_name}
                avatarUrl={listing.seller.avatar_url}
                size={48}
              />
              <div className="flex-1">
                <Link
                  href={`/u/${listing.seller.username}`}
                  className="font-semibold hover:underline"
                >
                  {listing.seller.display_name ?? listing.seller.username}
                </Link>
                <div className="text-[12px] text-ink2">@{listing.seller.username}</div>
              </div>
              <div className="text-right">
                {reviews > 0 ? (
                  <Stars rating={listing.seller.avg_rating ?? 0} reviews={reviews} />
                ) : (
                  <span className="text-[12px] text-ink3">No reviews yet</span>
                )}
              </div>
            </div>
            {listing.notes && (
              <div className="mt-4 rounded-lg border border-hair bg-surface2 p-3 text-[13px] leading-relaxed text-ink2">
                <div className="mb-1 text-[11px] uppercase tracking-wider text-ink3">
                  Seller notes
                </div>
                {listing.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Other listings from this seller */}
      {others.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Other listings from @{listing.seller.username}
            </h2>
            <Link
              href={`/u/${listing.seller.username}`}
              className="text-[12px] text-dx-blue hover:underline"
            >
              View profile →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {others.map((other) => (
              <Link
                key={other.id}
                href={`/market/${other.id}`}
                className="rounded-xl border border-hair bg-surface p-3 text-left transition-colors hover:border-ink3"
              >
                <div className="card-ratio relative mb-2 overflow-hidden rounded-lg bg-surface2">
                  <CardArtThumb card={other.card} />
                </div>
                <div className="truncate text-sm font-semibold">{other.card.name}</div>
                <div className="font-mono text-[11px] text-ink3">
                  {[other.card.set_code, other.card.number].filter(Boolean).join(" · ")}
                </div>
                <div className="mt-1 text-sm font-bold tabular-nums text-dx-red">
                  {formatPrice(other.asking_price)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CardArtThumb({ card }: { card: ListingCard }) {
  const src = listingImageUrl(card);
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-ink3">
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
      sizes="200px"
      className="object-cover"
      onError={() => setErrored(true)}
    />
  );
}
