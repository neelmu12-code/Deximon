import Link from "next/link";

export const metadata = {
  title: "Terms of Service - Deximon",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-ink">
      <Link href="/" className="text-[13px] text-dx-blue hover:underline">
        ← Back to home
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-ink3">Last updated July 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink2">
        <p>
          Deximon is a hobbyist platform for cataloguing Pokémon TCG collections and
          arranging trades and sales between collectors. By creating an account you agree
          to use the service in good faith and to follow the guidelines below.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">Your account</h2>
          <p>
            You are responsible for keeping your login details secure and for any activity
            that happens under your account. Let us know if you believe your account has
            been accessed without your permission.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">Listings and trades</h2>
          <p>
            Deximon connects buyers and sellers but is not a party to any transaction.
            Describe your cards honestly, and settle payment and shipping directly with the
            other collector. We do not process payments or guarantee any trade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">Acceptable use</h2>
          <p>
            Do not use Deximon to harass other users, post misleading listings, or upload
            content you do not have the right to share. We may suspend accounts that break
            these rules.
          </p>
        </section>

        <p className="text-ink3">
          This is a student project and these terms are provided as a plain-language
          placeholder rather than formal legal advice.
        </p>
      </div>
    </main>
  );
}
