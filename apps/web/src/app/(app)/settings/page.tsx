import { SettingsForm } from "./SettingsForm";

export const metadata = {
  title: "Settings - Deximon",
};

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Edit your display name, bio, avatar, and binder visibility.
        </p>
      </header>

      <SettingsForm />
    </section>
  );
}
