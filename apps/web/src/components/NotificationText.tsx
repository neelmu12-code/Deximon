"use client";

import Link from "next/link";
import { notificationActorUsername, type Notification } from "@/lib/notifications";

export function NotificationText({
  notification,
  className = "text-[13px] text-ink leading-snug",
}: {
  notification: Notification;
  className?: string;
}) {
  const username = notificationActorUsername(notification);

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
    </div>
  );
}
