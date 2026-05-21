export const metadata = {
  title: "Notifications — Deximon",
};

export default function NotificationsPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          New messages and listing state changes. Same stream that powers the
          unread badge on the bell in the nav.
        </p>
      </header>

      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        Nothing to show.
      </div>
    </section>
  );
}
