export const metadata = {
  title: "Scan a card — Deximon",
};

export default function ScanPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Scan a card</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Upload a clear photo of a physical card. The scanner pre-fills name,
          set, number, and rarity — you confirm holo, condition, and language,
          then save to your binder.
        </p>
      </header>

      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        Upload flow not wired up yet.
      </div>
    </section>
  );
}
