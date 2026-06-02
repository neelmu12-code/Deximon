import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BinderPreview } from "@/components/profile/BinderPreview";
import { Avatar } from "@/components/ui/Avatar";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import { avatarHue, userDisplayName } from "@/lib/userDisplay";
import type { PublicProfile } from "@/lib/auth";

type Params = { username: string };

const DEMO_LISTINGS = [
  { id: "L-2055", name: "Charizard", price: 124.00, status: "Available" as const, image: "https://images.pokemontcg.io/base1/4.png"  },
  { id: "L-2056", name: "Mewtwo",    price: 96.50,  status: "Available" as const, image: "https://images.pokemontcg.io/base1/10.png" },
  { id: "L-2057", name: "Blastoise", price: 88.00,  status: "Available" as const, image: "https://images.pokemontcg.io/base1/2.png"  },
  { id: "L-2058", name: "Gyarados",  price: 43.00,  status: "On Hold"   as const, image: "https://images.pokemontcg.io/base1/6.png"  },
];

const SET_PROGRESS = [
  { code: "BS",  name: "Base Set", have: 42, total: 102 },
  { code: "JGL", name: "Jungle",   have: 24, total: 64  },
  { code: "FSL", name: "Fossil",   have: 18, total: 62  },
];

const STATUS_COLORS = {
  "Available": "text-dx-green",
  "On Hold":   "text-dx-gold",
  "Sold":      "text-ink3",
} as const;

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
    { label: "Binder", value: binderIsPublic ? "Public" : "Private" },
    { label: "Cards owned", value: "Demo" },
    { label: "Cards listed", value: "Demo" },
    { label: "Completed trades", value: "Pending" },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-8">
      {/* profile header */}
      <div className="flex items-start gap-6 flex-wrap">
        <Avatar name={name} hue={avatarHue(profile.username)} size={96} ring />

        <div className="flex-1 min-w-[260px]">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-ink">{name}</h1>
            <span className="text-ink2">@{profile.username}</span>
          </div>
          <p className="text-ink2 text-sm mt-1 max-w-xl">{profile.bio ?? "No bio yet."}</p>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11px] font-medium tracking-wide bg-[#0f2a1d] text-[#8bdcae] border-[#1c4a33]">
              <span className="w-1.5 h-1.5 rounded-full bg-dx-green inline-block" />
              Profile loaded
            </span>
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
          <Link
            href="/settings"
            className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-md bg-dx-red text-white hover:bg-[#B71C2C] transition-colors"
          >
            Edit profile
          </Link>
        </div>
      </div>

      {/* main grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* binder - left 9 cols */}
        <div className="col-span-12 xl:col-span-9">
          <BinderPreview />
        </div>

        {/* right rail - 3 cols */}
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
            <div className="grid grid-cols-2 gap-3">
              {DEMO_LISTINGS.map((l) => (
                <Link key={l.id} href={`/market/${l.id}`} className="group">
                  <div className="relative aspect-[5/7] rounded-lg overflow-hidden mb-1.5 shadow-md transition-transform duration-200 group-hover:-translate-y-1">
                    <Image
                      src={l.image}
                      alt={l.name}
                      fill
                      className="object-cover"
                      sizes="12vw"
                    />
                  </div>
                  <div className="text-[11px] font-semibold truncate text-ink2 group-hover:text-ink transition-colors">
                    {l.name}
                  </div>
                  <div className={`text-[10px] font-bold tabular-nums ${STATUS_COLORS[l.status]}`}>
                    ${l.price.toFixed(2)}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Set progress */}
          <div className="bg-surface border border-hair rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink3 mb-3">Set progress</div>
            <div className="space-y-3">
              {SET_PROGRESS.map((s) => (
                <div key={s.code}>
                  <div className="flex items-center justify-between text-[12px] mb-1.5">
                    <span>
                      <span className="font-mono text-ink3">{s.code}</span>
                      {" "}
                      <span className="text-ink">{s.name}</span>
                    </span>
                    <span className="tabular-nums text-ink2">{s.have}/{s.total}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-hair overflow-hidden">
                    <div
                      className="h-full bg-dx-red rounded-full"
                      style={{ width: `${(s.have / s.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
