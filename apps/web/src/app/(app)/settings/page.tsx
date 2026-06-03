import { SettingsForm } from "./SettingsForm";

export const metadata = {
  title: "Settings - Deximon",
};

export default function SettingsPage() {
  return (
    <section className="max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-ink2 mt-1">
          Manage your profile, social links, privacy, and account security.
        </p>
      </header>

      <SettingsForm />
    </section>
  );
}
