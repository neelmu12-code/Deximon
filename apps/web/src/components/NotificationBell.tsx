"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationText } from "@/components/NotificationText";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { fetchAPI, wsUrl } from "@/lib/fetchAPI";
import {
  emitNotificationsReadAll,
  markAllNotificationsRead,
  notificationActorAvatarUrl,
  notificationActorDisplayName,
  notificationActorUsername,
  notificationWhen,
  onNotificationsReadAll,
  type Notification,
  type NotificationList,
} from "@/lib/notifications";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const load = useCallback(async () => {
    const data = await fetchAPI<NotificationList>("/notifications?limit=10");
    if (!data) return;
    setNotifications(data.notifications);
    setUnread(data.unread_count);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl("/notifications/ws"));
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as {
        type: string;
        unread_count?: number;
        notification?: Notification;
      };
      if (payload.type === "ready" || payload.type === "unread_count") {
        if (payload.unread_count != null) setUnread(payload.unread_count);
      }
      if (payload.type === "notification" && payload.notification) {
        setNotifications((current) => [payload.notification!, ...current].slice(0, 10));
        if (payload.unread_count != null) setUnread(payload.unread_count);
        if (payload.notification.type === "message") {
          window.dispatchEvent(new CustomEvent("inbox:refresh"));
        }
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    return onNotificationsReadAll(() => {
      setNotifications((current) => current.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    });
  }, []);

  async function markAllRead() {
    setNotifications((current) => current.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    try {
      await markAllNotificationsRead(10);
      wsRef.current?.send(JSON.stringify({ action: "read_all" }));
      emitNotificationsReadAll();
    } catch {
      await load();
    }
  }

  function toggleOpen() {
    setOpen((value) => {
      if (!value) load().catch(() => undefined);
      return !value;
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={toggleOpen}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
          open ? "bg-surface2 text-ink" : "text-ink2 hover:bg-surface2 hover:text-ink"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-dx-red ring-2 ring-base" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[380px] rounded-xl border border-hair bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-hair px-4 py-3">
            <div className="text-sm font-semibold">Notifications</div>
            <button
              type="button"
              onClick={markAllRead}
              className="text-[12px] text-dx-blue hover:underline"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink3">Nothing to show.</div>
            ) : (
              notifications.map((n) => {
                const actor = notificationActorUsername(n);
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 border-b border-hair/60 px-4 py-3 transition-colors hover:bg-surface2 ${
                      !n.is_read ? "bg-surface/60" : ""
                    }`}
                  >
                    {actor ? (
                      <UserAvatar
                        username={actor}
                        displayName={notificationActorDisplayName(n)}
                        avatarUrl={notificationActorAvatarUrl(n)}
                        size={32}
                      />
                    ) : (
                      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hair bg-surface2 text-ink2">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" />
                          <path d="M10 20a2 2 0 0 0 4 0" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <NotificationText notification={n} />
                      <div className="mt-0.5 text-[11px] text-ink3">
                        {notificationWhen(n.created_at)} ago
                      </div>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-dx-red" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-hair p-3 text-center">
            <Link href="/notifications" className="text-[12px] text-dx-blue hover:underline">
              See all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
