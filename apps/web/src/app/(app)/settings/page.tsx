export const metadata = {
  title: "Settings — Deximon",
};

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Edit your display name, bio, avatar, and binder visibility (public,
          unlisted, or private).
        </p>
      </header>

      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        Settings form not implemented yet.
      </div>
    </section>
  );
}
