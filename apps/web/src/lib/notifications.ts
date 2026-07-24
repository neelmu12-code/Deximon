import { fetchAPI } from "@/lib/fetchAPI";

export type NotificationType = "message" | "listing_status" | "review" | "review_prompt";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  meta: Record<string, string>;
  created_at: string;
};

export type NotificationList = {
  notifications: Notification[];
  unread_count: number;
};

/** Actor username for message/review/listing notifications (API `title` or meta). */
export function notificationActorUsername(notification: Notification): string | null {
  const fromMeta =
    notification.meta?.reviewer_username ??
    notification.meta?.sender_username ??
    notification.meta?.actor_username;
  if (fromMeta?.trim()) return fromMeta.trim();

  const fromTitle = notification.title?.trim();
  return fromTitle || null;
}

export function notificationActorDisplayName(notification: Notification): string | null {
  const fromMeta = notification.meta?.actor_display_name?.trim();
  return fromMeta || null;
}

export function notificationActorAvatarUrl(notification: Notification): string | null {
  const fromMeta = notification.meta?.actor_avatar_url?.trim();
  return fromMeta || null;
}

/**
 * Where a notification should take you when acted on, or null if nowhere useful.
 * A message goes straight to its conversation rather than via the inbox list.
 */
export function notificationHref(notification: Notification): string | null {
  const conversationId = notification.meta?.conversation_id;
  const listingId = notification.meta?.listing_id;

  switch (notification.type) {
    case "review_prompt":
      if (listingId) return `/review/${listingId}`;
      // Prompts sent before the review page existed have no listing_id.
      return conversationId ? `/inbox/${conversationId}?review=1` : null;
    case "message":
      return conversationId ? `/inbox/${conversationId}` : null;
    case "listing_status":
      return listingId ? `/market/${listingId}` : null;
    case "review": {
      const seller = notification.meta?.seller_username;
      return seller ? `/u/${seller}` : null;
    }
  }
}

/** Call-to-action wording for notifications worth acting on, else null. */
export function notificationActionLabel(notification: Notification): string | null {
  switch (notification.type) {
    case "review_prompt":
      return "Leave a review";
    case "message":
      return "Open chat";
    case "listing_status":
      return "View listing";
    case "review":
      return null;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function notificationWhen(iso: string): string {
  return timeAgo(iso);
}

const NOTIFICATIONS_READ_ALL_EVENT = "deximon:notifications-read-all";

/** Notify other UI surfaces (e.g. nav bell) that all notifications were read. */
export function emitNotificationsReadAll() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATIONS_READ_ALL_EVENT));
}

export function onNotificationsReadAll(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(NOTIFICATIONS_READ_ALL_EVENT, listener);
  return () => window.removeEventListener(NOTIFICATIONS_READ_ALL_EVENT, listener);
}

export async function markAllNotificationsRead(limit = 50): Promise<NotificationList | null> {
  return fetchAPI<NotificationList>(`/notifications/read-all?limit=${limit}`, { method: "PATCH" });
}
