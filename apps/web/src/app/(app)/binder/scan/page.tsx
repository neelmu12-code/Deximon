import { ScannerUploadFlow } from "./ScannerUploadFlow";

export const metadata = {
  title: "Scan a card - Deximon",
};

export default function ScanPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Scan a card</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Upload a clear photo of a physical card. The scanner pre-fills name,
          set, number, and rarity - you confirm holo, condition, and language,
          then save to your binder.
        </p>
      </header>

      <ScannerUploadFlow />
    </section>
  );
}
