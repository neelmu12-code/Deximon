"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { Wordmark } from "./Wordmark";

type NavLinkItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
  badgeCount?: number;
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Could not load unread count.";
}

const BASE_NAV_LINKS: Omit<NavLinkItem, "badgeCount">[] = [
  {
    href: "/binder",
    label: "Binder",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
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
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
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
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M4 13l3-8h10l3 8" />
        <path d="M4 13v6h16v-6" />
        <path d="M4 13h5l1 2h4l1-2h5" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/inbox"),
  },
];

export function Nav() {
  const pathname = usePathname();
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [, setUnreadError] = useState<string | null>(null);

  useEffect(() => {
    let activeController: AbortController | null = null;

    const refreshUnreadCount = () => {
      activeController?.abort();
      activeController = new AbortController();

      fetchAPI<{ unread_count: number }>('/conversations/unread-count', {
        signal: activeController.signal,
      })
        .then((data) => {
          setInboxUnreadCount(data?.unread_count ?? 0);
          setUnreadError(null);
        })
        .catch((loadError: unknown) => {
          if (loadError instanceof Error && loadError.name === 'AbortError') return;
          setUnreadError(errorMessage(loadError));
          setInboxUnreadCount(0);
        });
    };

    const handleInboxRefresh = () => {
      refreshUnreadCount();
    };

    window.addEventListener('inbox:refresh', handleInboxRefresh);
    refreshUnreadCount();

    return () => {
      window.removeEventListener('inbox:refresh', handleInboxRefresh);
      activeController?.abort();
    };
  }, []);

  const navLinks: NavLinkItem[] = useMemo(
    () =>
      BASE_NAV_LINKS.map((link) =>
        link.href === "/inbox"
          ? { ...link, badgeCount: inboxUnreadCount }
          : link,
      ),
    [inboxUnreadCount],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-hair bg-base/75 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-[1440px] items-center px-8">
        <Link href="/" className="shrink-0">
          <Wordmark />
        </Link>

        <div className="flex flex-1 items-center justify-center gap-1">
          {navLinks.map((l) => {
            const active = l.match(pathname);
            const unread = l.badgeCount ?? 0;
            const showBadge = unread > 0;
            const badgeLabel = unread > 99 ? "99+" : String(unread);

            return (
              <Link
                key={l.href}
                href={l.href}
                aria-label={
                  l.label === "Inbox" && showBadge
                    ? `Inbox, ${unread} unread conversation${unread === 1 ? "" : "s"}`
                    : l.label
                }
                className={`relative inline-flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-surface2 text-ink"
                    : "text-ink2 hover:bg-surface2/60 hover:text-ink"
                }`}
              >
                {l.icon}
                <span>{l.label}</span>

                {showBadge && (
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full border border-dx-red bg-dx-red px-1.5 text-[10px] font-semibold leading-4 text-white">
                    {badgeLabel}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="shrink-0 flex items-center gap-1">
          <Link
            href="/market"
            aria-label="Search the marketplace"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink2 transition-colors hover:bg-surface2 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
          </Link>

          <NotificationBell />
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}