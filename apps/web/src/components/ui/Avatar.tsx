interface AvatarProps {
  name: string;
  hue: number;
  size?: number;
  ring?: boolean;
  className?: string;
}

export function Avatar({ name, hue, size = 32, ring = false, className = "" }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={[
        "rounded-full inline-flex items-center justify-center font-semibold text-white/90 shrink-0",
        ring && "ring-2 ring-base outline outline-1 outline-hair",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(120% 120% at 30% 25%, oklch(0.55 0.13 ${hue}), oklch(0.28 0.08 ${hue}))`,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials}
    </div>
  );
}
