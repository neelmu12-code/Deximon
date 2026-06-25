"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import type { ReviewList } from "@/lib/reviews";
import { Stars } from "@/components/ui/Stars";

export function ProfileReviews({ username }: { username: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<ReviewList | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReview = Boolean(user && user.username !== username);

  useEffect(() => {
    fetchAPI<ReviewList>(`/reviews/seller/${encodeURIComponent(username)}`)
      .then((result) => setData(result))
      .catch(() => undefined);
  }, [username]);

  async function submitReview() {
    setSubmitting(true);
    setError(null);
    try {
      await fetchAPI(`/reviews/seller/${encodeURIComponent(username)}`, {
        method: "POST",
        body: { rating, comment: comment.trim() || null },
      });
      const refreshed = await fetchAPI<ReviewList>(`/reviews/seller/${encodeURIComponent(username)}`);
      setData(refreshed);
      setOpen(false);
      setComment("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-surface border border-hair rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-ink3">Seller reviews</div>
        {canReview && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] text-dx-blue hover:underline"
          >
            Leave a review
          </button>
        )}
      </div>

      {data && data.review_count > 0 && data.avg_rating != null && (
        <Stars rating={data.avg_rating} reviews={data.review_count} />
      )}

      {open && (
        <div className="space-y-3 border border-hair rounded-lg p-3">
          <label className="block text-sm">
            Rating
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="mt-1 w-full rounded border border-hair bg-transparent px-3 py-2 text-sm"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} star{value === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Comment
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-hair bg-transparent px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="button"
            onClick={submitReview}
            disabled={submitting}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-950"
          >
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </div>
      )}

      {!data || data.reviews.length === 0 ? (
        <p className="text-sm text-ink3 text-center py-2">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {data.reviews.map((review) => (
            <div key={review.id} className="border-t border-hair pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/u/${review.reviewer_username}`}
                  className="text-sm font-medium text-dx-blue hover:underline"
                >
                  @{review.reviewer_username}
                </Link>
                <Stars rating={review.rating} />
              </div>
              {review.comment && <p className="text-sm text-ink2 mt-1">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
