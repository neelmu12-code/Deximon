/**
 * NotificationBell — PLACEHOLDER.
 *
 * Renders an inert bell icon in the top-right of the nav with a "0"
 * unread badge. It is intentionally `disabled` so clicking it does
 * nothing right now — there is nothing to open, and we don't want a
 * teammate to wire up a half-working dropdown that other code starts
 * depending on.
 *
 * Why it's here even though the notification service doesn't exist
 * yet: the nav is being scaffolded ahead of the chat/notification
 * backend so everyone develops into a consistent visual frame. When
 * the notification stream lands, the changes needed are local to this
 * file:
 *   1. Mark this `"use client"` and read the unread count from the
 *      notification WebSocket connection (or from a context that owns
 *      it).
 *   2. Replace the static "0" badge with that count; hide the badge
 *      when count === 0.
 *   3. Drop `disabled` and make the click open a dropdown of recent
 *      notifications, marking them read on open.
 *
 * No icon dependency on purpose — the bell is an inline SVG so we
 * aren't adding a UI library just for a placeholder.
 */
export function NotificationBell() {
  return (
    <button
      type="button"
      aria-label="Notifications (placeholder — not yet wired up)"
      title="Notifications (coming soon)"
      disabled
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10 21a2 2 0 0 0 4 0" />
      </svg>
      <span
        aria-hidden="true"
        className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-neutral-300 px-1 text-[10px] font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
      >
        0
      </span>
    </button>
  );
}
