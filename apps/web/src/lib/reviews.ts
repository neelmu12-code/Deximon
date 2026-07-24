export type Review = {
  id: string;
  reviewer_username: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type ReviewList = {
  reviews: Review[];
  avg_rating: number | null;
  review_count: number;
};

/** Whether the signed-in user may review a seller, so the UI doesn't offer a form that 403s. */
export type ReviewEligibility = {
  can_review: boolean;
  already_reviewed: boolean;
  listing_id: string | null;
  listing_card_name: string | null;
};
