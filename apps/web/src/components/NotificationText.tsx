"use client";

import Link from "next/link";
import {
  notificationActionLabel,
  notificationActorUsername,
  notificationHref,
  type Notification,
} from "@/lib/notifications";

export function NotificationText({
  notification,
  className = "text-[13px] text-ink leading-snug",
}: {
  notification: Notification;
  className?: string;
}) {
  const username = notificationActorUsername(notification);
  const href = notificationHref(notification);
  const actionLabel = notificationActionLabel(notification);

  return (
    <div className={className}>
      {username ? (
        <>
          <Link href={`/u/${username}`} className="font-semibold text-ink hover:underline">
            @{username}
          </Link>{" "}
        </>
      ) : null}
      <span className="text-ink2">{notification.body}</span>
      {href && actionLabel && (
        <div className="mt-1">
          <Link href={href} className="text-[12px] text-dx-blue hover:underline">
            {actionLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}
