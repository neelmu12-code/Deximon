import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - Deximon",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-ink">
      <Link href="/" className="text-[13px] text-dx-blue hover:underline">
        ← Back to home
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink3">Last updated July 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink2">
        <p>
          This policy explains what information Deximon collects and how it is used. We try
          to keep data collection to the minimum needed to run the service.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">What we collect</h2>
          <p>
            When you sign up we store your email, username, and profile details. As you use
            the app we store the cards in your binder, your listings, and the messages you
            send to other collectors.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">How we use it</h2>
          <p>
            Your information is used to operate the marketplace, show your public profile
            and binder to other users, and deliver notifications. Your binder can be set to
            private in settings, and we do not sell your data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">Your choices</h2>
          <p>
            You can edit your profile, change your binder visibility, or delete your account
            at any time. Removing your account also removes your listings and binder data.
          </p>
        </section>

        <p className="text-ink3">
          This is a student project and this policy is a plain-language placeholder rather
          than formal legal advice.
        </p>
      </div>
    </main>
  );
}
