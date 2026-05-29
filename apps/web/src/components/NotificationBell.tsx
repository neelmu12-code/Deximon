"use client";

import { useEffect, useRef, useState } from "react";

// Demo notifications — replace with real data once the notification service lands.
const DEMO_NOTIFS = [
  { id: 1, who: "kintsugi", body: "sent you a message about Charizard", when: "2m", unread: true },
  { id: 2, who: "foilfiend", body: "listed a new Mewtwo (Holo Rare)", when: "5h", unread: true },
  { id: 3, who: "oxblood", body: "replied in your Blastoise conversation", when: "1d", unread: true },
  { id: 4, who: null, body: "Your Venusaur listing was viewed 18 times today", when: "1d", unread: false },
  { id: 5, who: "goldleaf_77", body: "lowered the price on Raichu to $92.50", when: "2d", unread: false },
];

function initials(handle: string) {
  return handle.slice(0, 2).toUpperCase();
}

function Avatar({ handle, hue }: { handle: string; hue: number }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white/90 shrink-0"
      style={{
        background: `radial-gradient(120% 120% at 30% 25%, oklch(0.55 0.13 ${hue}), oklch(0.28 0.08 ${hue}))`,
      }}
    >
      {initials(handle)}
    </div>
  );
}

const AVATAR_HUES: Record<string, number> = {
  kintsugi: 38,
  foilfiend: 210,
  oxblood: 0,
  goldleaf_77: 48,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = DEMO_NOTIFS.filter((n) => n.unread).length;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className={`w-9 h-9 rounded-md inline-flex items-center justify-center transition-colors ${
          open ? "bg-surface2 text-ink" : "text-ink2 hover:text-ink hover:bg-surface2"
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-dx-red ring-2 ring-base" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-surface border border-hair rounded-xl shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hair">
            <div className="font-semibold text-sm">Notifications</div>
            <button className="text-[12px] text-dx-blue hover:underline">Mark all as read</button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {DEMO_NOTIFS.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 border-b border-hair/60 hover:bg-surface2 transition-colors ${
                  n.unread ? "bg-surface/60" : ""
                }`}
              >
                {n.who ? (
                  <Avatar handle={n.who} hue={AVATAR_HUES[n.who] ?? 200} />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface2 border border-hair inline-flex items-center justify-center text-ink2 shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" />
                      <path d="M10 20a2 2 0 0 0 4 0" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-ink leading-snug">
                    {n.who && <span className="font-semibold">{n.who} </span>}
                    <span className="text-ink2">{n.body}</span>
                  </div>
                  <div className="text-[11px] text-ink3 mt-0.5">{n.when} ago</div>
                </div>
                {n.unread && <span className="w-2 h-2 rounded-full bg-dx-red mt-1.5 shrink-0" />}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-hair text-center">
            <button className="text-[12px] text-dx-blue hover:underline">See all notifications →</button>
          </div>
        </div>
      )}
    </div>
  );
}
