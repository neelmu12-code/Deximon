"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export interface HeroCard {
  src: string;
  name: string;
}

interface ShelfItem {
  idx: number;
  x: number; // % offset from center
  y: number;
  rot: number; // degrees
  z: number;
  scale: number;
  alpha?: number;
}

// idx:2 is the center/topmost card (highest z, largest scale) — that's Mewtwo.
const LAYOUT: ShelfItem[] = [
  { idx: 0, x: -36, y: 10, rot: -14, z: 1, scale: 0.92 },
  { idx: 1, x: -18, y: -6, rot: -7, z: 2, scale: 0.98 },
  { idx: 2, x: 0, y: -12, rot: 0, z: 4, scale: 1.05 },
  { idx: 3, x: 18, y: -6, rot: 7, z: 2, scale: 0.98 },
  { idx: 4, x: 36, y: 10, rot: 14, z: 1, scale: 0.92 },
  { idx: 5, x: -50, y: 44, rot: -22, z: 0, scale: 0.78, alpha: 0.85 },
  { idx: 6, x: 50, y: 44, rot: 22, z: 0, scale: 0.78, alpha: 0.85 },
];

export default function HeroShelf({ cards }: { cards: HeroCard[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    setTilt({ x, y });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative mx-auto select-none"
      style={{ width: "min(560px, 95%)", aspectRatio: "1.1 / 1", perspective: "2400px" }}
    >
      <div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.y * -4}deg) rotateY(${tilt.x * 6}deg)`,
          transition: "transform 0.25s ease-out",
        }}
      >
        {LAYOUT.map((it) => {
          const card = cards[it.idx];
          if (!card) return null;

          const px = it.x * 4;
          const py = it.y * 3;
          const dx = tilt.x * (8 + it.z * 4);
          const dy = tilt.y * (4 + it.z * 2);

          return (
            <div
              key={it.idx}
              className="absolute left-1/2 top-1/2"
              style={{
                width: "46%",
                aspectRatio: "5 / 7",
                transform: `translate(-50%, -50%) translate(${px + dx}px, ${py + dy}px) rotate(${it.rot}deg) scale(${it.scale})`,
                zIndex: it.z + 10,
                opacity: it.alpha ?? 1,
                transition: "transform 0.25s ease-out",
              }}
            >
              <div className="relative w-full h-full">
                <Image
                  src={card.src}
                  alt={card.name}
                  fill
                  sizes="(max-width: 768px) 140px, 260px"
                  className="object-contain"
                  style={{
                    borderRadius: "4.5%",
                    boxShadow: it.alpha
                      ? "0 8px 24px -8px rgba(0,0,0,0.7)"
                      : "0 20px 60px -12px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.07)",
                    filter: it.alpha ? "saturate(0.7) brightness(0.8)" : undefined,
                  }}
                  draggable={false}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
