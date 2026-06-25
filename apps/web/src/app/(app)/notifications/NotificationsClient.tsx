"use client";

import { useEffect, useState } from "react";
import { NotificationText } from "@/components/NotificationText";
import { fetchAPI } from "@/lib/fetchAPI";
import {
  emitNotificationsReadAll,
  markAllNotificationsRead,
  notificationWhen,
  type NotificationList,
} from "@/lib/notifications";

export function NotificationsClient() {
  const [data, setData] = useState<NotificationList | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    fetchAPI<NotificationList>("/notifications?limit=50")
      .then((result) => setData(result))
      .finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    if (!data || markingRead) return;

    setMarkingRead(true);
    setData({
      ...data,
      unread_count: 0,
      notifications: data.notifications.map((n) => ({ ...n, is_read: true })),
    });

    try {
      const result = await markAllNotificationsRead(50);
      if (result) setData(result);
      emitNotificationsReadAll();
    } catch {
      const refreshed = await fetchAPI<NotificationList>("/notifications?limit=50");
      if (refreshed) setData(refreshed);
    } finally {
      setMarkingRead(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        Loading...
      </div>
    );
  }

  if (!data || data.notifications.length === 0) {
    return (
      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        Nothing to show.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={markingRead || data.unread_count === 0}
          className="text-sm text-dx-blue hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-default"
        >
          Mark all as read
        </button>
      </div>
      <div className="rounded border border-hair divide-y divide-hair">
        {data.notifications.map((n) => (
          <div key={n.id} className={`px-4 py-3 ${!n.is_read ? "bg-surface2/40" : ""}`}>
            <NotificationText notification={n} className="text-sm text-ink leading-snug" />
            <div className="text-xs text-ink3 mt-1">{notificationWhen(n.created_at)} ago</div>
          </div>
        ))}
      </div>
    </div>
  );
}
