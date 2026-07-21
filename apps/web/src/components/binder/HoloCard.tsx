"use client";

import { useEffect, useState } from "react";
import type { HoloType } from "@/lib/cardDetails";

// Reads the OS "reduce motion" setting.
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

// Foil treatment picked from rarity, full_art and holo_type.
type HoloVariant = "sir" | "full" | "holo" | "reverse_holo";

function holoVariant(
  holoType: HoloType | null | undefined,
  rarity: string | null | undefined,
  fullArt: boolean | null | undefined,
): HoloVariant | null {
  if (rarity && /special illustration rare/i.test(rarity)) return "sir";
  if (fullArt) return "full";
  if (holoType === "holo") return "holo";
  if (holoType === "reverse_holo") return "reverse_holo";
  return null;
}

type Props = React.HTMLAttributes<HTMLDivElement> & {
  holoType?: HoloType | null;
  rarity?: string | null;
  fullArt?: boolean | null;
  children: React.ReactNode;
};

// Wraps a card and adds a pointer-tracked foil sheen. Normal cards render as-is.
export function HoloCard({
  holoType,
  rarity,
  fullArt,
  className = "",
  children,
  onPointerMove,
  onPointerLeave,
  ...rest
}: Props) {
  const reduced = usePrefersReducedMotion();
  const variant = holoVariant(holoType, rarity, fullArt);

  if (!variant) {
    return (
      <div className={className} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} {...rest}>
        {children}
      </div>
    );
  }

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!reduced) {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${mx}%`);
      el.style.setProperty("--my", `${my}%`);
    }
    onPointerMove?.(e);
  };

  const handleLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!reduced) {
      e.currentTarget.style.removeProperty("--mx");
      e.currentTarget.style.removeProperty("--my");
    }
    onPointerLeave?.(e);
  };

  return (
    <div
      className={`holo ${reduced ? "holo-static" : ""} ${className}`}
      data-variant={variant}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...rest}
    >
      {children}
      <span className="holo-sheen" aria-hidden />
    </div>
  );
}
