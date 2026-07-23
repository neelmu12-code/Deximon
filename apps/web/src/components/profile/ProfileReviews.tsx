"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchAPI } from "@/lib/fetchAPI";
import type { ReviewEligibility, ReviewList } from "@/lib/reviews";
import { Stars } from "@/components/ui/Stars";

// The API only accepts a review from the buyer of a completed sale, so the button
// shows only for users it would accept and links to the review page for that sale.
export function ProfileReviews({ username }: { username: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<ReviewList | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);

  useEffect(() => {
    fetchAPI<ReviewList>(`/reviews/seller/${encodeURIComponent(username)}`)
      .then((result) => setData(result))
      .catch(() => undefined);
  }, [username]);

  useEffect(() => {
    if (!user || user.username === username) {
      setEligibility(null);
      return;
    }
    fetchAPI<ReviewEligibility>(`/reviews/seller/${encodeURIComponent(username)}/eligibility`)
      .then((result) => setEligibility(result))
      .catch(() => setEligibility(null));
  }, [username, user]);

  const canReview = Boolean(eligibility?.can_review && eligibility.listing_id);

  return (
    <div className="bg-surface border border-hair rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-ink3">Seller reviews</div>
        {canReview && (
          <Link
            href={`/review/${eligibility!.listing_id}`}
            className="text-[11px] text-dx-blue hover:underline"
          >
            Leave a review →
          </Link>
        )}
      </div>

      {data && data.review_count > 0 && data.avg_rating != null && (
        <Stars rating={data.avg_rating} reviews={data.review_count} />
      )}

      {canReview && eligibility?.listing_card_name && (
        <p className="text-[12px] text-ink3">
          You bought {eligibility.listing_card_name} from @{username}.
        </p>
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
