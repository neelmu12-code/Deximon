import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BinderPreview } from "@/components/profile/BinderPreview";
import { EditProfileButton } from "@/components/profile/EditProfileButton";
import { Avatar } from "@/components/ui/Avatar";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import { avatarHue, userDisplayName } from "@/lib/userDisplay";
import type { PublicProfile } from "@/lib/auth";

// Binder teammate: fetch binder pages here and pass them to <BinderPreview pages={...} />.
// Shape: CardSlot[][] — each inner array is one 9-slot page. Import CardSlot from
// @/components/profile/BinderPreview. Example call:
//   const binderPages = await fetchAPI<CardSlot[][]>(`/binder/${username}/pages`);

type Params = { username: string };

async function loadProfile(username: string): Promise<PublicProfile> {
  try {
    const profile = await fetchAPI<PublicProfile>(`/profiles/${encodeURIComponent(username)}`);
    if (!profile) notFound();
    return profile;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { username } = await params;
  return { title: `@${username} - Deximon` };
}

export default async function PublicProfilePage({ params }: { params: Promise<Params> }) {
  const { username } = await params;
  const profile = await loadProfile(username);
  const name = userDisplayName(profile);
  const binderIsPublic = profile.binder_visibility === "public";

  const stats = [
    { label: "Binder",           value: binderIsPublic ? "Public" : "Private" },
    { label: "Cards owned",      value: "—" },
    { label: "Cards listed",     value: "—" },
    { label: "Completed trades", value: "—" },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-8">
      {/* profile header */}
      <div className="flex items-start gap-6 flex-wrap">
        {/* Avatar — image if set, otherwise initials */}
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-hair shrink-0">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={name} fill className="object-cover" sizes="96px" />
          ) : (
            <Avatar name={name} hue={avatarHue(profile.username)} size={96} ring />
          )}
        </div>

        <div className="flex-1 min-w-[260px]">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-ink">{name}</h1>
            <span className="text-ink2">@{profile.username}</span>
          </div>
          <p className="text-ink2 text-sm mt-1 max-w-xl">{profile.bio ?? "No bio yet."}</p>

          {/* location + social links */}
          <div className="flex items-center gap-4 mt-2 flex-wrap text-[13px] text-ink3">
            {profile.location && (
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                {profile.location}
              </span>
            )}
            {profile.twitter_handle && (
              <a
                href={`https://x.com/${profile.twitter_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-ink transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                @{profile.twitter_handle}
              </a>
            )}
            {profile.instagram_handle && (
              <a
                href={`https://instagram.com/${profile.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-ink transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                @{profile.instagram_handle}
              </a>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11px] font-medium tracking-wide ${
                binderIsPublic
                  ? "bg-[#0f2a1d] text-[#8bdcae] border-[#1c4a33]"
                  : "bg-surface2 text-ink3 border-hair"
              }`}
            >
              {binderIsPublic ? "Public binder" : "Private binder"}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-1">
          <button className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-md bg-transparent text-ink border border-hair hover:bg-surface2 transition-colors">
            Share profile
          </button>
          {/* Only renders when the logged-in user matches this profile */}
          <EditProfileButton username={username} />
        </div>
      </div>

      {/* main grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* binder — left 9 cols */}
        {/* Binder teammate: pass pages={binderPages} once the API endpoint exists */}
        <div className="col-span-12 xl:col-span-9">
          <BinderPreview pages={[]} binderIsPublic={binderIsPublic} />
        </div>

        {/* right rail — 3 cols */}
        <div className="col-span-12 xl:col-span-3 space-y-6">
          {/* Quick stats */}
          <div className="bg-surface border border-hair rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink3 mb-3">Quick stats</div>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              {stats.map((s) => (
                <Fragment key={s.label}>
                  <dt className="text-ink3">{s.label}</dt>
                  <dd className="font-semibold tabular-nums text-right text-ink">{s.value}</dd>
                </Fragment>
              ))}
            </dl>
          </div>

          {/* Listings */}
          <div className="bg-surface border border-hair rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-ink3">Listings</div>
              <Link href="/market" className="text-[11px] text-dx-blue hover:underline">
                View all
              </Link>
            </div>
            <p className="text-sm text-ink3 text-center py-4">No active listings.</p>
          </div>

          {/* Set progress */}
          <div className="bg-surface border border-hair rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink3 mb-3">Set progress</div>
            <p className="text-sm text-ink3 text-center py-4">No sets tracked yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
