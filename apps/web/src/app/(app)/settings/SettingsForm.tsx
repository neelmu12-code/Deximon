"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type BinderVisibility, useAuth } from "@/lib/auth";

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unable to save settings. Please try again.";
}

export function SettingsForm() {
  const { initializing, updatePrivacy, updateProfile, user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [binderVisibility, setBinderVisibility] = useState<BinderVisibility>("public");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name ?? "");
    setBio(user.bio ?? "");
    setAvatarUrl(user.avatar_url ?? "");
    setBinderVisibility(user.binder_visibility);
  }, [user]);

  if (initializing) {
    return (
      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        Loading your profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        <p className="mb-3">Sign in to edit your profile and binder privacy.</p>
        <Link href="/login" className="text-dx-blue hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      if (binderVisibility !== user.binder_visibility) {
        await updatePrivacy(binderVisibility);
      }
      setSuccess("Settings saved.");
    } catch (submitError) {
      setError(messageFromError(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-hair bg-surface p-6 space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
            Display name
          </label>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={80}
            className="h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
            Avatar URL
          </label>
          <input
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            type="url"
            placeholder="https://..."
            className="h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none placeholder:text-ink3 focus:border-ink2"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={500}
          rows={4}
          className="w-full rounded-md border border-hair bg-surface2 px-3 py-2 text-sm text-ink outline-none focus:border-ink2"
        />
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
          Binder visibility
        </label>
        <select
          value={binderVisibility}
          onChange={(event) => setBinderVisibility(event.target.value as BinderVisibility)}
          className="h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2 md:w-[240px]"
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <p className="mt-2 text-[12px] text-ink3">
          Backend note: the current profile API supports public and private. Unlisted is not exposed yet.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-dx-red/40 bg-dx-red/10 px-3 py-2 text-[13px] text-dx-red">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-dx-green/40 bg-dx-green/10 px-3 py-2 text-[13px] text-dx-green">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="h-10 rounded-md bg-dx-red px-4 text-sm font-medium text-white transition-colors hover:bg-dx-red-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
