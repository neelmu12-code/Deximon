"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export interface HeroCard {
  src: string;
  name: string;
}

interface ShelfItem {
  idx: number;
  x: number;
  y: number;
  rot: number;
  z: number;
  scale: number;
  alpha?: number;
}

// Preserved from the original Deximon landing UI: Mewtwo is the center card.
const LAYOUT: ShelfItem[] = [
  { idx: 0, x: -36, y: 10, rot: -14, z: 1, scale: 0.92 },
  { idx: 1, x: -18, y: -6, rot: -7, z: 2, scale: 0.98 },
  { idx: 2, x: 0, y: -12, rot: 0, z: 4, scale: 1.05 },
  { idx: 3, x: 18, y: -6, rot: 7, z: 2, scale: 0.98 },
  { idx: 4, x: 36, y: 10, rot: 14, z: 1, scale: 0.92 },
  { idx: 5, x: -50, y: 44, rot: -22, z: 0, scale: 0.78, alpha: 0.85 },
  { idx: 6, x: 50, y: 44, rot: 22, z: 0, scale: 0.78, alpha: 0.85 },
];

export function HeroShelf({ cards }: { cards: HeroCard[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMouseMove(event: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({ x, y });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="original-hero-shelf"
    >
      <div
        className="original-hero-shelf-inner"
        style={{ transform: `rotateX(${tilt.y * -4}deg) rotateY(${tilt.x * 6}deg)` }}
      >
        {LAYOUT.map((item) => {
          const card = cards[item.idx];
          if (!card) return null;

          const px = item.x * 4;
          const py = item.y * 3;
          const dx = tilt.x * (8 + item.z * 4);
          const dy = tilt.y * (4 + item.z * 2);

          return (
            <div
              className="original-shelf-card"
              key={item.idx}
              style={{
                width: "46%",
                transform: `translate(-50%, -50%) translate(${px + dx}px, ${py + dy}px) rotate(${item.rot}deg) scale(${item.scale})`,
                zIndex: item.z + 10,
                opacity: item.alpha ?? 1,
              }}
            >
              <Image
                src={card.src}
                alt={card.name}
                fill
                sizes="(max-width: 768px) 140px, 260px"
                className="original-shelf-image"
                style={{
                  boxShadow: item.alpha
                    ? "0 8px 24px -8px rgba(0,0,0,0.7)"
                    : "0 20px 60px -12px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.07)",
                  filter: item.alpha ? "saturate(0.7) brightness(0.8)" : undefined,
                }}
                draggable={false}
                priority={item.idx === 2}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
