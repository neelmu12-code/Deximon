export const metadata = {
  title: "Inbox — Deximon",
};

export default function InboxPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Your chat threads. Each conversation is tied to a specific listing,
          so buyers can&apos;t open a generic chat — only a chat about a specific
          card.
        </p>
      </header>

      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        No conversations yet.
      </div>
    </section>
  );
}
