import { NotificationsClient } from "./NotificationsClient";

export const metadata = {
  title: "Notifications — Deximon",
};

export default function NotificationsPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          New messages and listing state changes.
        </p>
      </header>
      <NotificationsClient />
    </section>
  );
}
