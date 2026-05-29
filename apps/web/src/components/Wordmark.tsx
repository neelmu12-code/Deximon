interface WordmarkProps {
  size?: "sm" | "base" | "lg";
  className?: string;
}

export function Wordmark({ size = "base", className = "" }: WordmarkProps) {
  const textSize = { sm: "text-base", base: "text-xl", lg: "text-3xl" }[size];
  const ballSize = { sm: 16, base: 20, lg: 28 }[size];
  return (
    <span
      className={`inline-flex items-center font-extrabold tracking-tight text-ink select-none ${textSize} ${className}`}
    >
      Dexim
      <svg
        viewBox="0 0 24 24"
        width={ballSize}
        height={ballSize}
        aria-hidden
        style={{ display: "inline-block", verticalAlign: "-0.15em" }}
      >
        <circle cx="12" cy="12" r="10.5" fill="currentColor" />
        <path
          d="M1.5 12.5h8.6a2 2 0 0 1 3.8 0H22.5"
          stroke="#0B0B0E"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="12" cy="12.5" r="2.2" fill="#0B0B0E" />
        <circle cx="12" cy="12.5" r="1" fill="currentColor" />
      </svg>
      n
    </span>
  );
}
