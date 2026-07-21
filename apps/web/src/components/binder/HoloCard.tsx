"use client";

import { useEffect, useState } from "react";
import type { HoloType } from "@/lib/cardDetails";

// Tracks the OS "reduce motion" preference. When true we drop cursor tracking
// and fall back to a subtle static sheen so the card still reads as foil.
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

// The visual treatment a card gets. Derived from rarity + full_art + holo_type:
//   sir          — Special Illustration Rare → full-card rainbow foil sweep
//   full         — full-art foil (e.g. holo promos) → full-card colourless glare
//   holo         — colourless glare limited to the artwork window
//   reverse_holo — colourless glare on the frame (everything but the artwork)
type HoloVariant = "sir" | "full" | "holo" | "reverse_holo";

function holoVariant(
  holoType: HoloType | null | undefined,
  rarity: string | null | undefined,
  fullArt: boolean | null | undefined,
): HoloVariant | null {
  // SIR is a rarity and wins over everything — the whole card is rainbow foil.
  if (rarity && /special illustration rare/i.test(rarity)) return "sir";
  // A full-art card carries its foil across the whole card, so the glare isn't
  // confined to an artwork window regardless of holo/reverse.
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

// Wraps a rendered card and layers a foil sheen chosen by holoVariant(). The
// sheen follows the pointer via --mx / --my CSS custom properties (see the
// `/* Holo */` block in globals.css). For a non-foil card it renders a plain
// passthrough <div> with no effect, so callers can wrap unconditionally.
//
// Only transform/background-position/opacity animate — kept GPU-cheap on purpose,
// no WebGL. Pointer handlers set the vars imperatively so a full 9-card page
// doesn't re-render React state on every mousemove.
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
