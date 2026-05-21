export const metadata = {
  title: "Marketplace — Deximon",
};

export default function MarketplacePage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Marketplace</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Browse cards listed by other collectors. Filter by name, set, rarity,
          type, condition, and listing status. Filters live in the URL so any
          search is shareable.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
          Filter sidebar.
        </aside>
        <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
          No listings yet.
        </div>
      </div>
    </section>
  );
}
