"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { Wordmark } from "./Wordmark";

const NAV_LINKS = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M4 11l8-7 8 7" />
        <path d="M6 10v9h12v-9" />
      </svg>
    ),
    match: (p: string) => p === "/",
  },
  {
    href: "/binder",
    label: "Binder",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
        <path d="M8 3.5v17M11 8h6M11 12h6M11 16h6" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/binder"),
  },
  {
    href: "/market",
    label: "Marketplace",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M4 8l1-3h14l1 3" />
        <path d="M5 8v11h14V8" />
        <path d="M9 12h6" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/market"),
  },
  {
    href: "/inbox",
    label: "Inbox",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M4 13l3-8h10l3 8" />
        <path d="M4 13v6h16v-6" />
        <path d="M4 13h5l1 2h4l1-2h5" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/inbox"),
  },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-base/75 border-b border-hair">
      <nav className="max-w-[1440px] mx-auto px-6 h-14 flex items-center">
        {/* Wordmark */}
        <Link href="/" className="mr-6">
          <Wordmark />
        </Link>

        {/* Centre links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((l) => {
            const active = l.match(pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`inline-flex items-center gap-2 px-3 h-9 rounded-md text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-surface2 text-ink"
                    : "text-ink2 hover:text-ink hover:bg-surface2/60"
                }`}
              >
                {l.icon}
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* Right: search, bell, avatar */}
        <div className="ml-auto flex items-center gap-1">
          <button
            aria-label="Search"
            className="w-9 h-9 rounded-md inline-flex items-center justify-center text-ink2 hover:text-ink hover:bg-surface2 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
          </button>

          <NotificationBell />
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}
