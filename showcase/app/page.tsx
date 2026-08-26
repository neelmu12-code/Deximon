import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { HeroShelf, type HeroCard } from "@/components/HeroShelf";
import { DEMO_CARDS } from "@/lib/demo-data";

const repositoryUrl = "https://github.com/neelmu12-code/Deximon";

const HERO_CARDS: HeroCard[] = [
  { src: "https://images.pokemontcg.io/base1/58_hires.png", name: "Pikachu" },
  { src: "https://images.pokemontcg.io/base1/4_hires.png", name: "Charizard" },
  { src: "https://images.pokemontcg.io/base1/10_hires.png", name: "Mewtwo" },
  { src: "https://images.pokemontcg.io/base1/2_hires.png", name: "Blastoise" },
  { src: "https://images.pokemontcg.io/base1/15_hires.png", name: "Venusaur" },
  { src: "https://images.pokemontcg.io/base1/63_hires.png", name: "Squirtle" },
  { src: "https://images.pokemontcg.io/base1/14_hires.png", name: "Raichu" },
];

const TICKER = [
  { kind: "LISTED", card: "Charizard", set: "Base 4/102", price: "$892.00", seller: "@foilfiend" },
  { kind: "ON HOLD", card: "Mewtwo", set: "Base 10/102", price: "$245.00", seller: "@kintsugi" },
  { kind: "LISTED", card: "Blastoise", set: "Base 2/102", price: "$380.00", seller: "@oxblood" },
  { kind: "SOLD", card: "Venusaur", set: "Base 15/102", price: "$285.00", seller: "@goldleaf_77" },
  { kind: "LISTED", card: "Raichu", set: "Base 14/102", price: "$92.50", seller: "@ashen_lake" },
  { kind: "LISTED", card: "Gyarados", set: "Base 6/102", price: "$145.00", seller: "@duskmoth" },
];

const capabilities = [
  {
    index: "01",
    title: "Scan a physical card",
    copy: "Validate and normalize an upload, extract text, rank catalog matches, then confirm the card before it enters the binder.",
    demo: "scanner",
  },
  {
    index: "02",
    title: "Curate a digital binder",
    copy: "Organize cards in tactile 3×3 pages, manage card details and visibility, and turn owned cards into listings.",
    demo: "binder",
  },
  {
    index: "03",
    title: "Trade with context",
    copy: "Browse condition-aware listings, inspect seller profiles, and open conversations tied to the exact card being discussed.",
    demo: "marketplace",
  },
  {
    index: "04",
    title: "Build marketplace trust",
    copy: "Keep buyers and sellers informed through status changes, unread notifications, and post-transaction reviews.",
    demo: "reviews",
  },
];

const highlights = [
  {
    number: "01",
    title: "Identity that supports two entry points",
    copy: "Email/password accounts and Google OAuth converge on the same user model. JWTs work through an httpOnly browser cookie or a Bearer token for API clients.",
    tags: ["Google OAuth", "JWT", "bcrypt"],
  },
  {
    number: "02",
    title: "A marketplace built from the collection model",
    copy: "Binder inventory is the source for listings. Listing states, buyer/seller ownership, scoped conversations, notifications, and reviews form one connected domain.",
    tags: ["SQLAlchemy", "REST", "state model"],
  },
  {
    number: "03",
    title: "A separately deployable scanner service",
    copy: "The scanner has its own FastAPI boundary and resource profile: image normalization, S3 upload, Rekognition OCR, and fuzzy matching against a local card catalog.",
    tags: ["Pillow", "S3", "Rekognition"],
  },
  {
    number: "04",
    title: "Production-minded operating controls",
    copy: "Docker health checks, Nginx request and connection limits, Redis-backed registration throttling, durable usage caps, and environment-driven configuration control runtime risk and cost.",
    tags: ["Docker", "Nginx", "Redis"],
  },
];

const securityControls = [
  {
    title: "Credential protection",
    copy: "Passwords are hashed with bcrypt through Passlib. Password-reset tokens are generated with a cryptographic RNG and stored as HMAC-SHA-256 digests rather than raw tokens.",
  },
  {
    title: "Session and token handling",
    copy: "Signed JWT access tokens carry issued-at and expiry claims. Browser sessions use an httpOnly, SameSite=Lax cookie with a configurable Secure flag; API clients may use Bearer auth.",
  },
  {
    title: "Authorization boundaries",
    copy: "Protected FastAPI dependencies resolve active users from validated tokens, while binder, marketplace, chat, notification, profile, and review routes enforce resource ownership and participant checks.",
  },
  {
    title: "Edge and abuse controls",
    copy: "Credentialed CORS uses configured origin allowlists. Nginx applies endpoint-specific body, request, and connection limits; Redis and PostgreSQL back application-level rate and usage limits.",
  },
  {
    title: "Configuration hygiene",
    copy: "Runtime credentials are read from environment-backed settings. The committed example file contains key names and safe defaults, while the real .env path is ignored by Git.",
  },
  {
    title: "Transport and upload safeguards",
    copy: "The production proxy is configured for HTTPS through Certbot. Upload paths constrain request sizes and accepted formats, and the scanner decodes, rotates, converts, and bounds images before OCR.",
  },
];

const technologies = [
  "Next.js 15",
  "React 19",
  "TypeScript",
  "Tailwind CSS",
  "FastAPI",
  "Pydantic",
  "SQLAlchemy 2",
  "Alembic",
  "PostgreSQL 16",
  "Redis 7",
  "Docker Compose",
  "Nginx",
  "AWS EC2",
  "AWS S3",
  "AWS Rekognition",
  "Google OAuth",
  "JWT",
  "Pillow",
  "OpenCV",
  "RapidFuzz",
  "Pytest",
  "Vitest",
];

function Eyebrow({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <div className="eyebrow">
      <span>{number}</span>
      <span className="eyebrow-rule" />
      <span>{children}</span>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#capabilities">Marketplace</a>
          <a href="/demo/#binder">The Binder</a>
          <a href="#architecture">How it works</a>
        </nav>
        <div className="header-actions">
          <a className="header-github" href={repositoryUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link className="button button--small button--primary" href="/demo/">
            Explore demo
          </Link>
          <details className="mobile-menu">
            <summary aria-label="Open navigation">Menu</summary>
            <nav aria-label="Mobile navigation">
              <a href="#capabilities">Marketplace</a>
              <a href="/demo/#binder">The Binder</a>
              <a href="#architecture">Architecture</a>
              <a href="#security">Security</a>
              <a href="#engineering">Engineering</a>
              <a href={repositoryUrl} target="_blank" rel="noreferrer">
                View GitHub
              </a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

function ArchitectureDiagram() {
  return (
    <div className="architecture-diagram" aria-label="Original Deximon system architecture">
      <div className="architecture-tier architecture-tier--client">
        <div className="architecture-label">Client</div>
        <div className="architecture-node architecture-node--wide">
          <span className="node-kicker">Web application</span>
          <strong>Next.js · React · TypeScript</strong>
          <small>App Router UI, Tailwind design system, REST client</small>
        </div>
      </div>

      <div className="architecture-connector" aria-hidden="true">
        <span>HTTPS / REST</span>
      </div>

      <div className="architecture-tier architecture-tier--edge">
        <div className="architecture-label">Edge</div>
        <div className="architecture-node architecture-node--wide architecture-node--edge">
          <span className="node-kicker">AWS EC2 host</span>
          <strong>Nginx reverse proxy</strong>
          <small>TLS termination · request limits · service routing</small>
        </div>
      </div>

      <div className="architecture-split" aria-hidden="true">
        <span />
      </div>

      <div className="architecture-tier architecture-tier--services">
        <div className="architecture-label">Services</div>
        <div className="architecture-service-grid">
          <div className="architecture-node">
            <span className="node-kicker">Core service</span>
            <strong>FastAPI REST API</strong>
            <small>Auth · profiles · binder · marketplace · chat · notifications · reviews</small>
          </div>
          <div className="architecture-node">
            <span className="node-kicker">Scanner service</span>
            <strong>FastAPI scanner</strong>
            <small>Image preprocessing · OCR orchestration · catalog matching</small>
          </div>
        </div>
      </div>

      <div className="architecture-split architecture-split--lower" aria-hidden="true">
        <span />
      </div>

      <div className="architecture-tier architecture-tier--data">
        <div className="architecture-label">Data & integrations</div>
        <div className="architecture-data-grid">
          <div className="architecture-node architecture-node--compact">
            <strong>PostgreSQL</strong>
            <small>Domain data + durable counters</small>
          </div>
          <div className="architecture-node architecture-node--compact">
            <strong>Redis</strong>
            <small>Rate-limit windows</small>
          </div>
          <div className="architecture-node architecture-node--compact">
            <strong>S3 + Rekognition</strong>
            <small>Scan image + text detection</small>
          </div>
          <div className="architecture-node architecture-node--compact">
            <strong>Google OAuth</strong>
            <small>OIDC identity provider</small>
          </div>
        </div>
      </div>
      <div className="architecture-runtime">
        <span>Containerized with Docker Compose</span>
        <span>Schema migrations with Alembic</span>
        <span>OpenAPI-documented REST boundaries</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="original-hero">
          <div className="original-hero-grid-bg" aria-hidden="true" />
          <div className="original-hero-inner">
            <div className="original-hero-copy">
              <div className="original-hero-kicker"><span /> Est. 2026 · Independent</div>
              <h1>
                Cards in,
                <br />
                <em>cards out.</em>
              </h1>
              <p className="original-hero-lede">A full-stack trading card collection and marketplace platform.</p>
              <p className="original-hero-description">
                Scan cards, catalog what you own, show it off in your binder, and trade with collectors—on your terms, directly.
              </p>
              <div className="original-hero-actions">
                <Link className="button button--primary" href="/demo/">
                  Explore demo
                </Link>
                <a className="button button--secondary" href="#architecture">
                  View architecture <span aria-hidden="true">›</span>
                </a>
                <a className="original-github-link" href={repositoryUrl} target="_blank" rel="noreferrer">
                  GitHub <span aria-hidden="true">↗</span>
                </a>
              </div>
              <div className="original-hero-features" aria-label="Demo capabilities">
                <span>Browser-only demo</span>
                <i />
                <span>Listing-scoped chat</span>
                <i />
                <span>Photo-scan catalog</span>
              </div>
            </div>
            <div className="original-hero-cards">
              <HeroShelf cards={HERO_CARDS} />
            </div>
          </div>
          <div className="original-ticker" aria-label="Sample marketplace activity">
            <div className="original-ticker-track">
              {[...TICKER, ...TICKER, ...TICKER].map((item, index) => (
                <span className="original-ticker-item" key={`${item.card}-${index}`}>
                  <b className={`ticker-kind ticker-kind--${item.kind.toLowerCase().replace(" ", "-")}`}>{item.kind}</b>
                  <strong>{item.card}</strong>
                  <em>{item.set}</em>
                  <b className="ticker-price">{item.price}</b>
                  <em>{item.seller}</em>
                  <i>◆</i>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="proof-strip" aria-label="Project at a glance">
          <div className="proof-item">
            <strong>03</strong>
            <span>application services</span>
          </div>
          <div className="proof-item">
            <strong>09</strong>
            <span>connected product domains</span>
          </div>
          <div className="proof-item">
            <strong>20k+</strong>
            <span>offline catalog records</span>
          </div>
          <div className="proof-item">
            <strong>100%</strong>
            <span>backend-free public demo</span>
          </div>
        </section>

        <section className="content-section section-shell" id="capabilities">
          <div className="section-heading">
            <div>
              <Eyebrow number="02">Product walkthrough</Eyebrow>
              <h2>One collection. Every workflow around it.</h2>
            </div>
            <p>
              The portfolio build uses deterministic mock data and local browser state to reconstruct the
              application&apos;s major workflows without calling the original infrastructure.
            </p>
          </div>
          <div className="capability-list">
            {capabilities.map((capability) => (
              <Link className="capability-row" href={`/demo/#${capability.demo}`} key={capability.index}>
                <span className="capability-index">{capability.index}</span>
                <h3>{capability.title}</h3>
                <p>{capability.copy}</p>
                <span className="row-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="demo-callout section-shell" aria-labelledby="demo-callout-title">
          <div className="demo-callout-copy">
            <Eyebrow number="03">Interactive product demo</Eyebrow>
            <h2 id="demo-callout-title">Try the connected experience.</h2>
            <p>
              Run a simulated scan, save the result to a binder, filter listings, message a seller, clear
              notifications, and leave a review. Every action is local, reversible, and clearly labeled.
            </p>
            <Link className="button button--primary" href="/demo/">
              Launch browser demo <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="demo-window" aria-hidden="true">
            <div className="demo-window-bar">
              <span />
              <span />
              <span />
              <b>deximon / binder</b>
            </div>
            <div className="mini-binder">
              {DEMO_CARDS.slice(0, 6).map((card) => (
                <div className="mini-card" key={card.id}>
                  <Image src={card.image} alt="" width={120} height={168} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="content-section content-section--ruled section-shell" id="architecture">
          <div className="section-heading section-heading--architecture">
            <div>
              <Eyebrow number="04">Original system architecture</Eyebrow>
              <h2>Three services, separated by responsibility.</h2>
            </div>
            <p>
              The deployed application used a Next.js client, a FastAPI domain API, and an independently
              deployable FastAPI scanner. PostgreSQL held durable state; Redis, AWS, and Google provided
              supporting capabilities.
            </p>
          </div>
          <ArchitectureDiagram />
        </section>

        <section className="content-section section-shell" id="engineering">
          <div className="section-heading">
            <div>
              <Eyebrow number="05">What I built</Eyebrow>
              <h2>Engineering across product, platform, and operations.</h2>
            </div>
            <p>
              The source repository preserves the full implementation: application code, migrations, tests,
              containers, API specifications, and deployment configuration.
            </p>
          </div>
          <div className="highlight-grid">
            {highlights.map((highlight) => (
              <article className="highlight" key={highlight.number}>
                <div className="highlight-number">{highlight.number}</div>
                <h3>{highlight.title}</h3>
                <p>{highlight.copy}</p>
                <div className="tag-row">
                  {highlight.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section content-section--security" id="security">
          <div className="section-shell">
            <div className="section-heading">
              <div>
                <Eyebrow number="06">Security engineering</Eyebrow>
                <h2>Controls that are visible in the code.</h2>
              </div>
              <p>
                This is a source-backed summary, not a claim of formal certification. Each item below maps to
                an implemented control in the preserved application.
              </p>
            </div>
            <div className="security-list">
              {securityControls.map((control, index) => (
                <article className="security-item" key={control.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{control.title}</h3>
                    <p>{control.copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="content-section section-shell" id="technology">
          <div className="section-heading section-heading--stack">
            <div>
              <Eyebrow number="07">Technology</Eyebrow>
              <h2>Built with a practical full-stack toolkit.</h2>
            </div>
          </div>
          <div className="technology-cloud" aria-label="Technologies used in the original Deximon application">
            {technologies.map((technology) => (
              <span key={technology}>{technology}</span>
            ))}
          </div>
        </section>

        <section className="final-cta section-shell">
          <div>
            <Eyebrow number="08">Explore the work</Eyebrow>
            <h2>The product is simulated. The engineering is preserved.</h2>
            <p>
              Use the browser demo for the product story, then inspect the repository for the original services,
              domain models, migrations, tests, infrastructure, and API contracts.
            </p>
          </div>
          <div className="final-actions">
            <Link className="button button--primary" href="/demo/">
              Explore demo
            </Link>
            <a className="button button--secondary" href={repositoryUrl} target="_blank" rel="noreferrer">
              Inspect source <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <Brand compact />
          <p>Full-stack collection and marketplace engineering, presented in static demo mode.</p>
          <div>
            <a href="#main-content">Back to top</a>
            <a href={repositoryUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
