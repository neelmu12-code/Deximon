"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Demo user — swap for real session data when auth lands.
const DEMO_USER = { name: "Marisol Vey", handle: "ashen_lake", hue: 12 };

function Avatar({ size = 32 }: { size?: number }) {
  const initials = DEMO_USER.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full inline-flex items-center justify-center font-semibold text-white/90 shrink-0 ring-2 ring-base outline outline-1 outline-hair"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        background: `radial-gradient(120% 120% at 30% 25%, oklch(0.55 0.13 ${DEMO_USER.hue}), oklch(0.28 0.08 ${DEMO_USER.hue}))`,
      }}
    >
      {initials}
    </div>
  );
}

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative ml-1">
      <button onClick={() => setOpen((v) => !v)} aria-label="User menu" className="flex items-center">
        <Avatar />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[220px] bg-surface border border-hair rounded-xl shadow-2xl z-50 py-1">
          {/* User info */}
          <div className="px-4 py-3 border-b border-hair">
            <div className="text-sm font-semibold text-ink">{DEMO_USER.name}</div>
            <div className="text-[12px] text-ink3">@{DEMO_USER.handle}</div>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href={`/u/${DEMO_USER.handle}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-[13px] text-ink2 hover:text-ink hover:bg-surface2 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              View profile
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-[13px] text-ink2 hover:text-ink hover:bg-surface2 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
              </svg>
              Settings
            </Link>
          </div>

          <div className="border-t border-hair py-1">
            <button
              className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-dx-red hover:bg-surface2 transition-colors"
              onClick={() => setOpen(false)}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
