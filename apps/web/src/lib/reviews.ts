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
