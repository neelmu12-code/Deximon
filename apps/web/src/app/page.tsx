import Image from "next/image";
import Link from "next/link";
import HeroShelf, { type HeroCard } from "@/components/landing/HeroShelf";

// ─── Data ────────────────────────────────────────────────────────────────────

// idx order matches the shelf layout: 0=far-left, 1=left, 2=CENTER(Mewtwo), 3=right, 4=far-right, 5=back-left, 6=back-right
const HERO_CARDS: HeroCard[] = [
  { src: "https://images.pokemontcg.io/base1/58_hires.png", name: "Pikachu" },
  { src: "https://images.pokemontcg.io/base1/4_hires.png", name: "Charizard" },
  { src: "https://images.pokemontcg.io/base1/10_hires.png", name: "Mewtwo" },
  { src: "https://images.pokemontcg.io/base1/2_hires.png", name: "Blastoise" },
  { src: "https://images.pokemontcg.io/base1/15_hires.png", name: "Venusaur" },
  { src: "https://images.pokemontcg.io/base1/63_hires.png", name: "Squirtle" },
  { src: "https://images.pokemontcg.io/base1/14_hires.png", name: "Raichu" },
];

const FEATURED = [
  { id: 1, name: "Charizard", set: "Base Set", num: "4/102", img: "https://images.pokemontcg.io/base1/4_hires.png", price: 892.0, cond: "NM", seller: "foilfiend", status: "Available" },
  { id: 2, name: "Mewtwo", set: "Base Set", num: "10/102", img: "https://images.pokemontcg.io/base1/10_hires.png", price: 245.0, cond: "NM", seller: "kintsugi", status: "Available" },
  { id: 3, name: "Blastoise", set: "Base Set", num: "2/102", img: "https://images.pokemontcg.io/base1/2_hires.png", price: 380.0, cond: "LP", seller: "oxblood", status: "Available" },
  { id: 4, name: "Venusaur", set: "Base Set", num: "15/102", img: "https://images.pokemontcg.io/base1/15_hires.png", price: 285.0, cond: "NM", seller: "goldleaf_77", status: "On Hold" },
  { id: 5, name: "Raichu", set: "Base Set", num: "14/102", img: "https://images.pokemontcg.io/base1/14_hires.png", price: 92.5, cond: "NM", seller: "ashen_lake", status: "Available" },
  { id: 6, name: "Gyarados", set: "Base Set", num: "6/102", img: "https://images.pokemontcg.io/base1/6_hires.png", price: 145.0, cond: "NM", seller: "duskmoth", status: "Available" },
  { id: 7, name: "Pikachu", set: "Base Set", num: "58/102", img: "https://images.pokemontcg.io/base1/58_hires.png", price: 45.0, cond: "NM", seller: "parchment", status: "Available" },
  { id: 8, name: "Hitmonchan", set: "Base Set", num: "7/102", img: "https://images.pokemontcg.io/base1/7_hires.png", price: 78.0, cond: "NM", seller: "ashen_lake", status: "Available" },
] as const;

const TICKER = [
  { card: "Charizard", set: "Base 4/102", price: "892.00", who: "foilfiend", when: "just now", kind: "listed" as const },
  { card: "Mewtwo", set: "Base 10/102", price: "245.00", who: "kintsugi", when: "2m ago", kind: "on hold" as const },
  { card: "Blastoise", set: "Base 2/102", price: "380.00", who: "oxblood", when: "15m ago", kind: "listed" as const },
  { card: "Venusaur", set: "Base 15/102", price: "285.00", who: "goldleaf_77", when: "1h ago", kind: "sold" as const },
  { card: "Raichu", set: "Base 14/102", price: "92.50", who: "ashen_lake", when: "3h ago", kind: "listed" as const },
  { card: "Gyarados", set: "Base 6/102", price: "145.00", who: "duskmoth", when: "4h ago", kind: "listed" as const },
];

// ─── Small atoms ─────────────────────────────────────────────────────────────

function Wordmark({ size = "base" }: { size?: "sm" | "base" | "lg" }) {
  const textSize = { sm: "text-base", base: "text-xl", lg: "text-3xl" }[size];
  const ballSize = { sm: 16, base: 20, lg: 28 }[size];
  return (
    <span className={`inline-flex items-center font-extrabold tracking-tight text-ink select-none ${textSize}`}>
      Dexim
      <svg
        viewBox="0 0 24 24"
        width={ballSize}
        height={ballSize}
        aria-hidden
        style={{ display: "inline-block", verticalAlign: "-0.15em" }}
      >
        <circle cx="12" cy="12" r="10.5" fill="currentColor" />
        <path
          d="M1.5 12.5h8.6a2 2 0 0 1 3.8 0H22.5"
          stroke="#0B0B0E"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="12" cy="12.5" r="2.2" fill="#0B0B0E" />
        <circle cx="12" cy="12.5" r="1" fill="currentColor" />
      </svg>
      n
    </span>
  );
}

type CondKey = "NM" | "LP" | "MP" | "HP" | "DMG";
const COND_CLASSES: Record<CondKey, string> = {
  NM: "bg-[#0f2a1d] text-[#8bdcae] border-[#1c4a33]",
  LP: "bg-surface2 text-ink2 border-hair",
  MP: "bg-[#2a2210] text-[#f2c94c] border-[#5a4818]",
  HP: "bg-[#2a0d10] text-[#ff8a8e] border-[#5a1a1f]",
  DMG: "bg-[#2a0d10] text-[#ff8a8e] border-[#5a1a1f]",
};

function CondChip({ cond }: { cond: string }) {
  const cls = COND_CLASSES[cond as CondKey] ?? "bg-surface2 text-ink2 border-hair";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-[3px] text-[11px] font-medium ${cls}`}>
      {cond}
    </span>
  );
}

type StatusKey = "Available" | "On Hold" | "Sold";
const STATUS_CLASSES: Record<StatusKey, { chip: string; dot: string }> = {
  Available: { chip: "bg-[#0f2a1d] text-[#8bdcae] border-[#1c4a33]", dot: "bg-[#3fb97a]" },
  "On Hold": { chip: "bg-[#2a2210] text-[#f2c94c] border-[#5a4818]", dot: "bg-[#f2c94c]" },
  Sold: { chip: "bg-[#1c1c22] text-[#6b7280] border-[#2c2c33]", dot: "bg-[#6b7280]" },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_CLASSES[status as StatusKey] ?? STATUS_CLASSES["Sold"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11px] font-medium ${s.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function LandingNav() {
  return (
    <div className="sticky top-0 z-30 border-b border-hair bg-base/80 backdrop-blur-md">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        <Wordmark />
        <nav className="hidden md:flex items-center gap-1 text-[13px] text-ink2">
          <a href="#market" className="px-3 h-9 inline-flex items-center rounded-md hover:text-ink hover:bg-surface2/60 transition-colors">
            Marketplace
          </a>
          <a href="#binder" className="px-3 h-9 inline-flex items-center rounded-md hover:text-ink hover:bg-surface2/60 transition-colors">
            The Binder
          </a>
          <a href="#trust" className="px-3 h-9 inline-flex items-center rounded-md hover:text-ink hover:bg-surface2/60 transition-colors">
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-3 h-9 inline-flex items-center text-[13px] font-medium text-dx-blue hover:underline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="h-8 px-3 inline-flex items-center rounded-md bg-dx-red text-white text-[12px] font-medium border border-dx-red hover:bg-dx-red-hover hover:border-dx-red-hover transition-colors"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Faint grid backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(0deg, rgba(216,35,42,.5) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(216,35,42,.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(80% 60% at 50% 30%, #000, transparent 80%)",
          WebkitMaskImage: "radial-gradient(80% 60% at 50% 30%, #000, transparent 80%)",
        }}
      />

      <div className="relative max-w-[1280px] mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-12 gap-8 items-center">
          {/* Left: headline + CTAs */}
          <div className="col-span-12 lg:col-span-6">
            <div className="inline-flex items-baseline gap-2 text-[11px] uppercase tracking-[0.28em] text-ink3 mb-6 font-mono">
              <span className="w-6 h-px bg-dx-red inline-block" />
              Est. 2026 · Independent
            </div>

            <h1 className="text-[64px] md:text-[88px] leading-[0.92] font-extrabold tracking-tight">
              Cards in,
              <br />
              <span className="text-dx-red italic">cards out.</span>
            </h1>

            <p className="mt-8 text-ink2 text-lg leading-relaxed max-w-md">
              The home for serious collectors. Catalog what you own, show it off in your binder, and trade — on your terms, directly.
            </p>

            <div className="mt-10 flex items-center gap-3 flex-wrap">
              <Link
                href="/signup"
                className="h-12 px-5 inline-flex items-center rounded-md bg-dx-red text-white text-[15px] font-medium border border-dx-red hover:bg-dx-red-hover transition-colors"
              >
                Start your binder
              </Link>
              <Link
                href="/market"
                className="h-12 px-5 inline-flex items-center gap-2 rounded-md bg-transparent text-ink text-[15px] font-medium border border-hair hover:bg-surface2 transition-colors"
              >
                Browse marketplace
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 6l6 6-6 6" />
                </svg>
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-6 text-[12px] text-ink3 flex-wrap">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                  <path d="M12 3l8 3v5c0 5-4 8.5-8 10-4-1.5-8-5-8-10V6l8-3z" />
                </svg>
                Buyer protection
              </div>
              <div className="w-px h-4 bg-hair" />
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="9" rx="1.5" />
                  <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                </svg>
                Listing-scoped chat
              </div>
              <div className="w-px h-4 bg-hair" />
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                  <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
                  <circle cx="12" cy="13.5" r="3.5" />
                </svg>
                Photo-scan catalog
              </div>
            </div>
          </div>

          {/* Right: card fan */}
          <div className="col-span-12 lg:col-span-6">
            <HeroShelf cards={HERO_CARDS} />
          </div>
        </div>
      </div>

      {/* Live ticker */}
      <div className="relative mt-6 border-y border-hair bg-[#0a0a0c] overflow-hidden">
        <div className="flex gap-10 py-3 whitespace-nowrap animate-ticker">
          {[...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-3 text-[12px] font-mono tabular-nums">
              <span
                className={`uppercase tracking-[0.22em] text-[10px] ${
                  t.kind === "listed" ? "text-dx-green" : t.kind === "sold" ? "text-ink3" : "text-dx-gold"
                }`}
              >
                {t.kind}
              </span>
              <span className="text-ink font-semibold">{t.card}</span>
              <span className="text-ink3">{t.set}</span>
              <span className="text-dx-red font-bold">${t.price}</span>
              <span className="text-ink3">@{t.who}</span>
              <span className="text-ink3">· {t.when}</span>
              <span className="text-hair">◆</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
          <circle cx="12" cy="13.5" r="3.5" />
        </svg>
      ),
      title: "Scan & catalog",
      body: "Photograph a card; we match it to the catalog. Confirm condition, language, holo. Done.",
    },
    {
      num: "02",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
          <path d="M8 3.5v17M11 8h6M11 12h6M11 16h6" />
        </svg>
      ),
      title: "Show off your binder",
      body: "A real 3×3 binder on your profile. Pages flip. Holos shine under the cursor. Friends can browse.",
    },
    {
      num: "03",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M4 13l3-8h10l3 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5" />
        </svg>
      ),
      title: "Trade with collectors",
      body: "List a card and a chat opens scoped to that listing. No cold DMs — just the card you came for.",
    },
  ];

  return (
    <section id="trust" className="border-b border-hair">
      <div className="max-w-[1280px] mx-auto px-6 py-24">
        <div className="grid grid-cols-12 gap-8 mb-12 items-end">
          <div className="col-span-12 md:col-span-7">
            <div className="text-[11px] uppercase tracking-[0.28em] text-ink3 font-mono mb-3">§ 01 — Method</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              A marketplace shaped
              <br />
              like a binder.
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5 text-ink2 text-[15px] leading-relaxed">
            Three pieces, joined at the hip. Your binder is the source of truth — list anything in it, and a chat opens scoped to that card. Nothing speculative, nothing generic.
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-hair border border-hair rounded-xl overflow-hidden">
          {steps.map((s) => (
            <div key={s.num} className="bg-base p-8">
              <div className="flex items-center justify-between mb-8">
                <span className="font-mono text-[11px] tracking-[0.22em] text-ink3">{s.num}</span>
                <span className="text-dx-red">{s.icon}</span>
              </div>
              <h3 className="text-2xl font-semibold tracking-tight">{s.title}</h3>
              <p className="text-ink2 text-[14px] mt-3 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedListings() {
  return (
    <section id="market" className="border-b border-hair">
      <div className="max-w-[1280px] mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-ink3 font-mono mb-3">§ 02 — Live now</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">On the marketplace</h2>
          </div>
          <Link href="/market" className="text-[13px] text-dx-blue hover:underline">
            View all listings →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {FEATURED.map((l) => (
            <Link
              key={l.id}
              href={`/market/${l.id}`}
              className="text-left bg-surface border border-hair rounded-xl p-3 hover:border-ink3 transition-colors block"
            >
              <div className="relative w-full mb-3" style={{ aspectRatio: "5/7" }}>
                <Image
                  src={l.img}
                  alt={l.name}
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 280px"
                  className="object-contain"
                  style={{ borderRadius: "4.5%" }}
                />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate text-ink">{l.name}</div>
                  <div className="text-[11px] text-ink3 font-mono">
                    {l.set} · {l.num}
                  </div>
                </div>
                <div className="text-dx-red font-bold text-sm shrink-0 tabular-nums">${l.price.toFixed(2)}</div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <CondChip cond={l.cond} />
                <StatusChip status={l.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Principles() {
  const items = [
    { h: "No noise", b: "No promoted listings. No bidding wars. No bots. Sellers list, buyers ask, deals close." },
    { h: "Listing-scoped chat", b: "You only DM someone about a specific card. No cold messages, no spam." },
    { h: "Honest condition", b: "Sellers grade their own cards. We display their record so you can judge for yourself." },
    { h: "Your binder, your rules", b: "Public, unlisted, or private. Show it all, or show no one. Your call." },
  ];

  return (
    <section id="binder" className="border-b border-hair">
      <div className="max-w-[1280px] mx-auto px-6 py-24">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-ink3 font-mono mb-3">§ 03 — Principles</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Built for people
              <br />
              who care about
              <br />
              <span className="italic text-dx-red">the cards.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-7 grid sm:grid-cols-2 gap-x-10 gap-y-8 text-[14px]">
            {items.map((p) => (
              <div key={p.h}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-dx-red" />
                  <h4 className="font-semibold">{p.h}</h4>
                </div>
                <p className="text-ink2 leading-relaxed">{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="border-b border-hair">
      <div className="max-w-[1280px] mx-auto px-6 py-24 text-center">
        <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          Start your <span className="italic text-dx-red">binder</span>.
        </h2>
        <p className="mt-5 text-ink2 max-w-md mx-auto">Free to join. List your first card in under a minute.</p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/signup"
            className="h-12 px-5 inline-flex items-center rounded-md bg-dx-red text-white text-[15px] font-medium border border-dx-red hover:bg-dx-red-hover transition-colors"
          >
            Create an account
          </Link>
          <Link
            href="/market"
            className="h-12 px-5 inline-flex items-center rounded-md bg-transparent text-ink text-[15px] font-medium border border-hair hover:bg-surface2 transition-colors"
          >
            Browse marketplace
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-wrap items-center justify-between gap-4">
        <Wordmark size="sm" />
        <nav className="flex items-center gap-5 text-[12px] text-ink2">
          {["About", "Marketplace", "Terms", "Privacy", "Contact"].map((l) => (
            <a key={l} href="#" className="hover:text-ink transition-colors">
              {l}
            </a>
          ))}
        </nav>
        <div className="text-[11px] text-ink3">
          © 2026 Deximon Labs · Independent collector tool · Not affiliated with any card publisher.
        </div>
      </div>
    </footer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base">
      <LandingNav />
      <HeroSection />
      <HowItWorks />
      <FeaturedListings />
      <Principles />
      <CTASection />
      <Footer />
    </div>
  );
}
