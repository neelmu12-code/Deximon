"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth } from "@/lib/auth";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import { formatPrice, listingImageUrl, type Listing } from "@/lib/marketplace";
import type { ReviewEligibility } from "@/lib/reviews";

const MAX_COMMENT_CHARS = 250;

const RATING_WORDS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

const STAR_POINTS = "6,1 7.2,4.4 10.8,4.5 7.9,6.6 8.9,10.1 6,8 3.1,10.1 4.1,6.6 1.2,4.5 4.8,4.4";

/**
 * Five clickable stars supporting half ratings: clicking a star once fills it
 * halfway (e.g. 4.5), clicking the same star again fills it fully, and a third
 * click drops it back to a half.
 */
function StarRatingInput({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (value: number) => void;
}) {
  function handleClick(star: number) {
    if (rating === star - 0.5) {
      onChange(star); // second click on this star → full
    } else if (rating === star) {
      onChange(star - 0.5); // clicking a full star again → back to half
    } else {
      onChange(star - 0.5); // first click on this star → half
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, rating - (star - 1)));
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => handleClick(star)}
            className="relative h-7 w-7 text-dx-gold transition-transform hover:scale-110"
          >
            <svg
              viewBox="0 0 12 12"
              className="absolute inset-0 h-7 w-7 text-ink3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinejoin="round"
            >
              <polygon points={STAR_POINTS} />
            </svg>
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <svg
                  viewBox="0 0 12 12"
                  className="h-7 w-7 max-w-none"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinejoin="round"
                >
                  <polygon points={STAR_POINTS} />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-10">
      <div className="rounded-xl border border-hair bg-surface p-6">{children}</div>
    </div>
  );
}

/**
 * The one review form, linked to from the review-prompt notification, the seller's
 * profile and the buyer's chat. Re-checks eligibility on load since those entry
 * points can be stale (or shared).
 */
export function ReviewClient({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initializing) return;
    let cancelled = false;
    setLoading(true);

    fetchAPI<Listing>(`/market/listings/${listingId}`)
      .then(async (data) => {
        if (cancelled || !data) return;
        setListing(data);
        if (!user) return;
        const result = await fetchAPI<ReviewEligibility>(
          `/reviews/seller/${encodeURIComponent(data.seller.username)}/eligibility`,
        );
        if (!cancelled) setEligibility(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listingId, user, initializing]);

  async function submit() {
    if (!listing) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchAPI(`/reviews/seller/${encodeURIComponent(listing.seller.username)}`, {
        method: "POST",
        body: { rating, comment: comment.trim() || null, listing_id: listing.id },
      });
      setSubmitted(true);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || initializing) {
    return (
      <Shell>
        <p className="text-center text-ink3">Loading…</p>
      </Shell>
    );
  }

  if (!listing) {
    return (
      <Shell>
        <p className="text-center text-ink2">{error ?? "That listing could not be found."}</p>
      </Shell>
    );
  }

  const seller = listing.seller;
  const image = listingImageUrl(listing.card);

  if (!user) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Log in to leave a review</h1>
        <p className="mt-2 text-sm text-ink2">
          Reviews are tied to your account, so you&apos;ll need to sign in first.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/review/${listingId}`)}`}
          className="mt-4 inline-flex h-10 items-center rounded-md bg-dx-red px-5 text-sm font-medium text-white hover:bg-dx-red-hover"
        >
          Log in
        </Link>
      </Shell>
    );
  }

  if (submitted || eligibility?.already_reviewed) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">
          {submitted ? "Thanks for the review" : "You already reviewed this seller"}
        </h1>
        <p className="mt-2 text-sm text-ink2">
          {submitted
            ? `Your review of @${seller.username} is now on their profile.`
            : `Each buyer leaves one review per seller, and yours for @${seller.username} is already up.`}
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href={`/u/${seller.username}`}
            className="inline-flex h-10 items-center rounded-md bg-dx-red px-5 text-sm font-medium text-white hover:bg-dx-red-hover"
          >
            View their profile
          </Link>
          <Link
            href="/market"
            className="inline-flex h-10 items-center rounded-md border border-hair px-5 text-sm text-ink2 hover:text-ink"
          >
            Back to marketplace
          </Link>
        </div>
      </Shell>
    );
  }

  if (!eligibility?.can_review) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">You can&apos;t review this sale</h1>
        <p className="mt-2 text-sm text-ink2">
          Reviews come from completed purchases: @{seller.username} has to mark a listing sold to
          you before you can rate them.
        </p>
        <Link
          href={`/market/${listing.id}`}
          className="mt-4 inline-flex h-10 items-center rounded-md border border-hair px-5 text-sm text-ink2 hover:text-ink"
        >
          Back to the listing
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-1 text-[11px] uppercase tracking-[0.22em] text-ink3">Leave a review</div>
      <h1 className="text-2xl font-bold tracking-tight">How was buying from @{seller.username}?</h1>

      <div className="mt-5 flex items-center gap-4 rounded-lg border border-hair bg-surface2 p-3">
        <div className="relative h-[84px] w-[60px] shrink-0 overflow-hidden rounded bg-surface">
          {image ? (
            <Image
              src={image}
              alt={listing.card.name}
              fill
              unoptimized
              sizes="60px"
              className="object-contain"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{listing.card.name}</div>
          <div className="font-mono text-[11px] text-ink3">
            {[listing.card.set_code, listing.card.number].filter(Boolean).join(" · ")}
          </div>
          <div className="mt-1 text-sm font-bold tabular-nums text-dx-red">
            {formatPrice(listing.asking_price)}
          </div>
        </div>
        <UserAvatar
          username={seller.username}
          displayName={seller.display_name}
          avatarUrl={seller.avatar_url}
          size={40}
        />
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium">Rating</div>
        <div className="mt-2 flex items-center gap-3">
          <StarRatingInput rating={rating} onChange={setRating} />
          <span className="text-sm text-ink2 tabular-nums">
            {rating % 1 === 0 ? rating.toFixed(0) : rating.toFixed(1)}
            {RATING_WORDS[rating] ? ` · ${RATING_WORDS[rating]}` : ""}
          </span>
        </div>
        <p className="mt-1.5 text-[12px] text-ink3">
          Click a star once for a half, twice for a full star.
        </p>
      </div>

      <label className="mt-5 block text-sm font-medium">
        Comment <span className="font-normal text-ink3">(optional)</span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value.slice(0, MAX_COMMENT_CHARS))}
          rows={4}
          maxLength={MAX_COMMENT_CHARS}
          placeholder="How was the communication, packing and shipping?"
          className="mt-2 w-full break-words rounded-md border border-hair bg-surface2 px-3 py-2 text-sm text-ink outline-none focus:border-ink3"
        />
        <span className="mt-1 block text-right text-[11px] text-ink3 tabular-nums">
          {comment.length}/{MAX_COMMENT_CHARS}
        </span>
      </label>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="inline-flex h-10 items-center rounded-md bg-dx-red px-5 text-sm font-medium text-white transition-colors hover:bg-dx-red-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Post review"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 items-center rounded-md border border-hair px-5 text-sm text-ink2 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </Shell>
  );
}
