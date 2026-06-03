"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { type BinderVisibility, type ProfileUpdateInput, useAuth } from "@/lib/auth";
import { fetchAPI } from "@/lib/fetchAPI";
import { avatarHue, userDisplayName } from "@/lib/userDisplay";

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/;

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-ink3">{title}</h2>
      {description && <p className="text-[12px] text-ink3 mt-0.5">{description}</p>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
      {children}
    </label>
  );
}

const inputCls =
  "h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2 transition-colors placeholder:text-ink3";

export function SettingsForm() {
  const { changePassword, initializing, updatePrivacy, updateProfile, user } = useAuth();
  const router = useRouter();

  // — profile state —
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [binderVisibility, setBinderVisibility] = useState<BinderVisibility>("public");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // — password state —
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  // seed form from user when it loads
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name ?? "");
    setUsername(user.username);
    setBio(user.bio ?? "");
    setLocation(user.location ?? "");
    setTwitterHandle(user.twitter_handle ?? "");
    setInstagramHandle(user.instagram_handle ?? "");
    setBinderVisibility(user.binder_visibility);
  }, [user?.id]); // only re-seed on user identity change, not every update

  // avatar file preview
  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  // debounced username availability check
  useEffect(() => {
    if (!user) return;
    const trimmed = username.trim().toLowerCase();

    if (trimmed === user.username) { setUsernameStatus("idle"); return; }
    if (!USERNAME_RE.test(username.trim())) { setUsernameStatus("invalid"); return; }

    setUsernameStatus("checking");
    const timeout = setTimeout(async () => {
      try {
        const result = await fetchAPI<{ available: boolean }>(
          `/profiles/check-username?username=${encodeURIComponent(trimmed)}`
        );
        setUsernameStatus(result?.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [username, user]);

  if (initializing) {
    return (
      <div className="rounded-xl border border-dashed border-hair p-12 text-center text-ink3">
        Loading your profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-dashed border-hair p-12 text-center text-ink3">
        <p className="mb-3">Sign in to edit your profile.</p>
        <Link href="/login" className="text-dx-blue hover:underline">Go to sign in</Link>
      </div>
    );
  }

  const name = userDisplayName(user);
  const canSaveProfile = usernameStatus !== "taken" && usernameStatus !== "invalid";

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSaveProfile || !user) return;

    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      let avatarUrl = user.avatar_url;

      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
        const uploaded = await fetchAPI<{ url: string }>("/profiles/me/avatar", {
          method: "POST",
          body: fd,
        });
        avatarUrl = uploaded?.url ?? avatarUrl;
      }

      const payload: ProfileUpdateInput = {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl || null,
        location: location.trim() || null,
        twitter_handle: twitterHandle.trim() || null,
        instagram_handle: instagramHandle.trim() || null,
      };

      if (username.trim().toLowerCase() !== user.username) {
        payload.username = username.trim();
      }

      await updateProfile(payload);

      if (binderVisibility !== user.binder_visibility) {
        await updatePrivacy(binderVisibility);
      }

      setAvatarFile(null);
      router.push(`/u/${username.trim().toLowerCase()}`);
    } catch (err) {
      setProfileError(messageFromError(err));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwError("New passwords don't match."); return; }

    setPwSaving(true);
    setPwError(null);
    setPwSuccess(null);

    try {
      await changePassword(currentPw, newPw);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwSuccess("Password updated.");
    } catch (err) {
      setPwError(messageFromError(err));
    } finally {
      setPwSaving(false);
    }
  }

  const usernameHint = {
    idle: null,
    checking: <span className="text-ink3">Checking...</span>,
    available: <span className="text-dx-green">Available</span>,
    taken: <span className="text-dx-red">Already taken</span>,
    invalid: <span className="text-dx-red">3–30 chars, letters/numbers/underscores only</span>,
  }[usernameStatus];

  return (
    <div className="space-y-6">
      {/* ── Profile section ── */}
      <form onSubmit={handleProfileSave} className="rounded-xl border border-hair bg-surface p-6 space-y-6">
        <SectionHeader title="Profile" />

        {/* Avatar + name row */}
        <div className="flex items-start gap-5 flex-wrap">
          {/* clickable avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-hair focus:outline-none focus:ring-2 focus:ring-dx-red/40"
              aria-label="Change profile photo"
            >
              {avatarPreview || user.avatar_url ? (
                <Image
                  src={avatarPreview ?? user.avatar_url!}
                  alt={name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <Avatar name={name} hue={avatarHue(user.username)} size={80} />
              )}
              <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-white text-[10px] mt-1 font-medium">Change</span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            />
            {avatarFile && (
              <button
                type="button"
                onClick={() => setAvatarFile(null)}
                className="text-[11px] text-ink3 hover:text-dx-red transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          {/* display name + username */}
          <div className="flex-1 min-w-[220px] grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Display name</FieldLabel>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                placeholder={user.username}
                className={inputCls}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>Username</FieldLabel>
                {usernameHint && (
                  <span className="text-[11px]">{usernameHint}</span>
                )}
              </div>
              <div className={`flex items-center h-10 rounded-md border bg-surface2 px-3 transition-colors ${
                usernameStatus === "taken" || usernameStatus === "invalid"
                  ? "border-dx-red/60"
                  : usernameStatus === "available"
                  ? "border-dx-green/60"
                  : "border-hair focus-within:border-ink2"
              }`}>
                <span className="text-ink3 text-sm select-none mr-0.5">@</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={30}
                  required
                  className="flex-1 bg-transparent outline-none text-sm text-ink"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel>Bio</FieldLabel>
            <span className="text-[11px] text-ink3 tabular-nums">{bio.length}/500</span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Tell other collectors a bit about yourself..."
            className="w-full rounded-md border border-hair bg-surface2 px-3 py-2 text-sm text-ink outline-none focus:border-ink2 transition-colors placeholder:text-ink3 resize-none"
          />
        </div>

        {/* Location */}
        <div>
          <FieldLabel>Location</FieldLabel>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={100}
            placeholder="Toronto, ON"
            className={inputCls}
          />
        </div>

        {/* Social links */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>X / Twitter</FieldLabel>
            <div className="flex items-center h-10 rounded-md border border-hair bg-surface2 px-3 focus-within:border-ink2 transition-colors">
              <span className="text-ink3 text-sm select-none mr-0.5">@</span>
              <input
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value.replace(/^@+/, ""))}
                maxLength={50}
                placeholder="your_handle"
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink3"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Instagram</FieldLabel>
            <div className="flex items-center h-10 rounded-md border border-hair bg-surface2 px-3 focus-within:border-ink2 transition-colors">
              <span className="text-ink3 text-sm select-none mr-0.5">@</span>
              <input
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value.replace(/^@+/, ""))}
                maxLength={50}
                placeholder="your_handle"
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink3"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-hair pt-5">
          <SectionHeader
            title="Privacy"
            description="Controls whether other collectors can browse your binder."
          />
          <select
            value={binderVisibility}
            onChange={(e) => setBinderVisibility(e.target.value as BinderVisibility)}
            className="h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2 md:w-[220px]"
          >
            <option value="public">Public — anyone can view</option>
            <option value="private">Private — only you</option>
          </select>
          <p className="mt-2 text-[12px] text-ink3">
            Backend note: the current profile API supports public and private. Unlisted is not exposed yet.
          </p>
        </div>

        {profileError && (
          <div className="rounded-md border border-dx-red/40 bg-dx-red/10 px-3 py-2 text-[13px] text-dx-red">
            {profileError}
          </div>
        )}
        {profileSuccess && (
          <div className="rounded-md border border-dx-green/40 bg-dx-green/10 px-3 py-2 text-[13px] text-dx-green">
            {profileSuccess}
          </div>
        )}

        <button
          type="submit"
          disabled={profileSaving || !canSaveProfile}
          className="h-10 rounded-md bg-dx-red px-5 text-sm font-medium text-white transition-colors hover:bg-dx-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {profileSaving ? "Saving..." : "Save profile"}
        </button>
      </form>

      {/* ── Password section ── */}
      <form onSubmit={handlePasswordSave} className="rounded-xl border border-hair bg-surface p-6 space-y-4">
        <SectionHeader
          title="Password"
          description="Leave blank to keep your current password. Google sign-in accounts have no password to change."
        />

        <div className="grid gap-4 md:grid-cols-3">
          {(
            [
              { label: "Current password",  value: currentPw,  set: setCurrentPw,  show: showCurrentPw,  setShow: setShowCurrentPw  },
              { label: "New password",       value: newPw,      set: setNewPw,      show: showNewPw,      setShow: setShowNewPw      },
              { label: "Confirm new",        value: confirmPw,  set: setConfirmPw,  show: showConfirmPw,  setShow: setShowConfirmPw  },
            ] as const
          ).map(({ label, value, set, show, setShow }) => (
            <div key={label}>
              <FieldLabel>{label}</FieldLabel>
              <div className="flex items-center h-10 rounded-md border border-hair bg-surface2 px-3 focus-within:border-ink2 transition-colors">
                <input
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink3"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="text-ink3 hover:text-ink2 transition-colors ml-1"
                  aria-label={show ? "Hide" : "Show"}
                >
                  <EyeIcon open={show} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {pwError && (
          <div className="rounded-md border border-dx-red/40 bg-dx-red/10 px-3 py-2 text-[13px] text-dx-red">
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="rounded-md border border-dx-green/40 bg-dx-green/10 px-3 py-2 text-[13px] text-dx-green">
            {pwSuccess}
          </div>
        )}

        <button
          type="submit"
          disabled={pwSaving || !currentPw || !newPw || !confirmPw}
          className="h-10 rounded-md bg-dx-red px-5 text-sm font-medium text-white transition-colors hover:bg-dx-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pwSaving ? "Updating..." : "Change password"}
        </button>
      </form>
    </div>
  );
}
