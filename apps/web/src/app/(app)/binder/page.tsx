import Link from "next/link";

export const metadata = {
  title: "Binder — Deximon",
};

export default function BinderPage() {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Your binder</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            9 slots per page. Drag cards to reorder. Holo and reverse-holo cards
            get a mouse-reactive shine.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/binder/scan"
            className="rounded-md bg-deximon px-3 py-1.5 text-sm font-medium text-white hover:bg-deximon-dark"
          >
            Scan a card
          </Link>
          <button
            type="button"
            disabled
            title="Manual-add modal not yet implemented"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700"
          >
            Add manually
          </button>
        </div>
      </header>

      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        No cards in your binder yet.
      </div>
    </section>
  );
}
