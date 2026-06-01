interface StarsProps {
  rating: number;
  reviews?: number;
}

export function Stars({ rating, reviews }: StarsProps) {
  const filled = Math.round(rating);

  return (
    <div className="inline-flex items-center gap-1 text-dx-gold">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          viewBox="0 0 12 12"
          className="w-3 h-3"
          fill={i < filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        >
          <polygon points="6,1 7.2,4.4 10.8,4.5 7.9,6.6 8.9,10.1 6,8 3.1,10.1 4.1,6.6 1.2,4.5 4.8,4.4" />
        </svg>
      ))}
      <span className="text-ink2 text-[11px] ml-0.5 tabular-nums">
        {rating.toFixed(1)}
        {reviews != null && <span className="text-ink3"> · {reviews}</span>}
      </span>
    </div>
  );
}
