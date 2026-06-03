"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { avatarHue, userDisplayName } from "@/lib/userDisplay";
import { Avatar } from "./ui/Avatar";

export function LandingUserWidget() {
  const router = useRouter();
  const { initializing, logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      setOpen(false);
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  if (initializing && !user) {
    return <div className="h-8 w-8 rounded-full border border-hair bg-surface2 animate-pulse" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="px-3 h-9 inline-flex items-center text-[13px] font-medium text-dx-blue hover:underline"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="h-8 px-3 inline-flex items-center rounded-md bg-dx-red text-white text-[12px] font-medium border border-dx-red hover:bg-dx-red-hover hover:border-dx-red-hover transition-colors"
        >
          Create an account
        </Link>
      </div>
    );
  }

  const name = userDisplayName(user);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        className="flex items-center"
      >
        {user.avatar_url ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-base outline outline-1 outline-hair shrink-0">
            <Image src={user.avatar_url} alt={name} fill className="object-cover" unoptimized />
          </div>
        ) : (
          <Avatar name={name} hue={avatarHue(user.username)} size={32} ring />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[220px] bg-surface border border-hair rounded-xl shadow-2xl z-50 py-1">
          <div className="px-4 py-3 border-b border-hair">
            <div className="text-sm font-semibold text-ink">{name}</div>
            <div className="text-[12px] text-ink3">@{user.username}</div>
          </div>

          <div className="py-1">
            <Link
              href="/binder"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-[13px] text-ink2 hover:text-ink hover:bg-surface2 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
                <path d="M8 3.5v17M11 8h6M11 12h6M11 16h6" />
              </svg>
              Go to Dashboard
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
              type="button"
              disabled={signingOut}
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-dx-red hover:bg-surface2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
