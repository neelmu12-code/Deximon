import Link from "next/link";

type BrandProps = {
  href?: string;
  compact?: boolean;
};

export function Brand({ href = "/", compact = false }: BrandProps) {
  return (
    <Link className={`brand${compact ? " brand--compact" : ""}`} href={href} aria-label="Deximon home">
      <span>Dexim</span>
      <svg
        className="brand-mark"
        viewBox="0 0 24 24"
        width={compact ? 16 : 20}
        height={compact ? 16 : 20}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10.5" fill="currentColor" />
        <path d="M1.5 12.5h8.6a2 2 0 0 1 3.8 0H22.5" stroke="#0B0B0E" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <circle cx="12" cy="12.5" r="2.2" fill="#0B0B0E" />
        <circle cx="12" cy="12.5" r="1" fill="currentColor" />
      </svg>
      <span>n</span>
    </Link>
  );
}
