interface StarsProps {
  rating: number;
  reviews?: number;
}

const STAR_POINTS = "6,1 7.2,4.4 10.8,4.5 7.9,6.6 8.9,10.1 6,8 3.1,10.1 4.1,6.6 1.2,4.5 4.8,4.4";

/**
 * Read-only rating display. Renders each of the five stars filled by a fraction
 * of its width, so a 4.5 rating shows four full stars and one half-filled one.
 */
export function Stars({ rating, reviews }: StarsProps) {
  return (
    <div className="inline-flex items-center gap-1 text-dx-gold">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span key={i} className="relative inline-block h-3 w-3">
            <svg
              viewBox="0 0 12 12"
              className="absolute inset-0 h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
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
                  className="h-3 w-3 max-w-none"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                >
                  <polygon points={STAR_POINTS} />
                </svg>
              </span>
            )}
          </span>
        );
      })}
      {reviews != null && (
        <span className="text-ink2 text-[11px] ml-0.5 tabular-nums">
          {rating.toFixed(1)}
          <span className="text-ink3"> · {reviews}</span>
        </span>
      )}
    </div>
  );
}
