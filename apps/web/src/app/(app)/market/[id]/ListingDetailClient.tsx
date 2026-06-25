"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import { Stars } from "@/components/ui/Stars";
import {
  formatPrice,
  listingStatusLabel,
  type Conversation,
  type Listing,
  type ListingStatus,
} from "@/lib/marketplace";

const STATUS_OPTIONS: ListingStatus[] = ["available", "on_hold", "sold", "cancelled"];

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export function ListingDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
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
      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        Loading listing...
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        {error ?? "Listing not found."}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm text-neutral-500">
          <Link href="/market" className="hover:underline">
            Marketplace
          </Link>{" "}
          / Listing
        </p>
        <h1 className="text-2xl font-semibold">{listing.card.name}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Listed by{" "}
          <Link href={`/u/${listing.seller.username}`} className="font-medium hover:underline">
            @{listing.seller.username}
          </Link>
          {listing.seller.review_count != null &&
            listing.seller.review_count > 0 &&
            listing.seller.avg_rating != null && (
              <span className="ml-2 inline-flex align-middle">
                <Stars rating={listing.seller.avg_rating} reviews={listing.seller.review_count} />
              </span>
            )}
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded border border-green-300 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="rounded border border-neutral-300 p-5 dark:border-neutral-800">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">Set</dt>
              <dd className="font-medium">{listing.card.set_code ?? "Pending"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Number</dt>
              <dd className="font-medium">{listing.card.number ?? "Pending"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Rarity</dt>
              <dd className="font-medium">{listing.card.rarity ?? "Pending"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Type</dt>
              <dd className="font-medium">{listing.card.card_type ?? "Pending"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Condition</dt>
              <dd className="font-medium">{listing.card.condition ?? "Pending"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Holo</dt>
              <dd className="font-medium">{listing.card.holo_type.replace("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Language</dt>
              <dd className="font-medium">{listing.card.language ?? "Pending"}</dd>
            </div>
          </dl>

          {listing.notes && (
            <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <div className="text-sm text-neutral-500">Seller notes</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{listing.notes}</p>
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded border border-neutral-300 p-5 dark:border-neutral-800">
          <div>
            <div className="text-sm text-neutral-500">Asking price</div>
            <div className="text-2xl font-semibold">{formatPrice(listing.asking_price)}</div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Status</div>
            <div className="font-medium">{listingStatusLabel(listing.status)}</div>
          </div>

          {isSeller ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Seller controls</label>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value as ListingStatus)}
                className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
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
                className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950"
              >
                {saving ? "Saving..." : "Update listing"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openChat}
              disabled={!user || openingChat}
              className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950"
            >
              {!user ? "Log in to chat" : openingChat ? "Opening..." : "Open chat"}
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}
