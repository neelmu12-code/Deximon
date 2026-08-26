"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Brand } from "@/components/Brand";
import {
  cardById,
  DEMO_CARDS,
  DEMO_LISTINGS,
  DEMO_NAV,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  SCAN_CARD,
  type DemoCard,
  type DemoListing,
  type DemoMessage,
  type DemoNotification,
  type DemoView,
} from "@/lib/demo-data";

const STORAGE_KEY = "deximon-showcase-state-v1";

type StoredDemoState = {
  binderIds: string[];
  savedListingIds: string[];
  notifications: DemoNotification[];
  messages: DemoMessage[];
};

const initialStoredState: StoredDemoState = {
  binderIds: DEMO_CARDS.slice(0, 6).map((card) => card.id),
  savedListingIds: [DEMO_LISTINGS[1].id],
  notifications: INITIAL_NOTIFICATIONS,
  messages: INITIAL_MESSAGES,
};

function isDemoView(value: string): value is DemoView {
  return DEMO_NAV.some((item) => item.id === value);
}

function money(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(value);
}

function DemoChip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "gold" | "red" }) {
  return <span className={`demo-chip demo-chip--${tone}`}>{children}</span>;
}

function CardArt({ card, compact = false, priority = false }: { card: DemoCard; compact?: boolean; priority?: boolean }) {
  return (
    <div className={`card-art${compact ? " card-art--compact" : ""}${card.holo ? " card-art--holo" : ""}`}>
      <Image src={card.image} alt={`${card.name}, ${card.set} ${card.number}`} width={245} height={342} priority={priority} />
      {card.holo && <span className="card-art-sheen" aria-hidden="true" />}
    </div>
  );
}

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <header className="demo-section-intro">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{copy}</p>
    </header>
  );
}

type ScannerViewProps = {
  binderIds: string[];
  addScannedCard: () => void;
  notify: (message: string) => void;
};

function ScannerView({ binderIds, addScannedCard, notify }: ScannerViewProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "ready" | "scanning" | "result">("idle");
  const isSaved = binderIds.includes(SCAN_CARD.id);

  function loadFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Choose a JPG, PNG, or WebP image for this local demo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(typeof reader.result === "string" ? reader.result : null);
      setFileName(file.name);
      setPhase("ready");
    };
    reader.readAsDataURL(file);
  }

  function useSample() {
    setPreview(SCAN_CARD.image);
    setFileName("pikachu-base-set.jpg");
    setPhase("ready");
  }

  function runScan() {
    if (!preview) return;
    setPhase("scanning");
    window.setTimeout(() => setPhase("result"), 720);
  }

  return (
    <section className="demo-view" aria-labelledby="scanner-heading">
      <SectionIntro
        eyebrow="CARD SCANNER / LOCAL SIMULATION"
        title="Turn a photo into a catalog match."
        copy="Choose an image or use the supplied sample. The preview stays on this device; the result is a deterministic fixture and no upload or API request occurs."
      />
      <div className="scanner-layout">
        <div className="scanner-dropzone">
          <input
            ref={fileInput}
            className="visually-hidden"
            id="demo-card-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => loadFile(event.target.files?.[0])}
          />
          {preview ? (
            <div className="scanner-preview">
              <Image src={preview} alt={`Local preview of ${fileName ?? "selected card"}`} fill unoptimized />
            </div>
          ) : (
            <div className="scanner-placeholder" aria-hidden="true">
              <span className="scanner-frame scanner-frame--one" />
              <span className="scanner-frame scanner-frame--two" />
              <b>Place card in frame</b>
            </div>
          )}
          <div className="scanner-controls">
            <button className="demo-button demo-button--secondary" type="button" onClick={() => fileInput.current?.click()}>
              Choose local image
            </button>
            <button className="demo-text-button" type="button" onClick={useSample}>
              Use sample card
            </button>
          </div>
          {fileName && <p className="file-note">Selected locally: {fileName}</p>}
          <button
            className="demo-button demo-button--primary demo-button--full"
            type="button"
            disabled={!preview || phase === "scanning" || phase === "result"}
            onClick={runScan}
          >
            {phase === "scanning" ? "Matching sample catalog…" : phase === "result" ? "Match complete" : "Run simulated scan"}
          </button>
        </div>

        <div className="scanner-result" aria-live="polite">
          {phase === "scanning" ? (
            <div className="scan-progress">
              <span className="scan-progress-line" />
              <b>Analyzing image</b>
              <p>Normalizing orientation · extracting text · ranking catalog candidates</p>
            </div>
          ) : phase === "result" ? (
            <>
              <div className="result-topline">
                <DemoChip tone="green">94% match</DemoChip>
                <span>Source: browser demo fixture</span>
              </div>
              <div className="result-card">
                <CardArt card={SCAN_CARD} compact />
                <div>
                  <span className="result-label">Top candidate</span>
                  <h2>{SCAN_CARD.name}</h2>
                  <p>{SCAN_CARD.set} · {SCAN_CARD.number}</p>
                  <dl className="result-facts">
                    <div><dt>Rarity</dt><dd>{SCAN_CARD.rarity}</dd></div>
                    <div><dt>Condition</dt><dd>{SCAN_CARD.condition}</dd></div>
                    <div><dt>Language</dt><dd>English</dd></div>
                  </dl>
                  <button
                    className="demo-button demo-button--primary"
                    type="button"
                    disabled={isSaved}
                    onClick={addScannedCard}
                  >
                    {isSaved ? "Saved to binder" : "Confirm and save to binder"}
                  </button>
                </div>
              </div>
              <div className="candidate-list">
                <span>Other candidates</span>
                <div><b>Raichu · Base Set 14/102</b><em>72%</em></div>
                <div><b>Pikachu · Jungle 60/64</b><em>68%</em></div>
              </div>
            </>
          ) : (
            <div className="result-empty">
              <span>01</span>
              <h2>Candidate results appear here.</h2>
              <p>Run the local simulation to see the confirmation workflow and save its result to your demo binder.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

type BinderViewProps = {
  binderIds: string[];
  setBinderIds: React.Dispatch<React.SetStateAction<string[]>>;
  openListing: (listing: DemoListing) => void;
  navigate: (view: DemoView) => void;
  notify: (message: string) => void;
};

function BinderView({ binderIds, setBinderIds, openListing, navigate, notify }: BinderViewProps) {
  const binderCards = binderIds.map((id) => (id === SCAN_CARD.id ? SCAN_CARD : cardById(id)));
  const [selectedId, setSelectedId] = useState(binderCards[0]?.id ?? "");
  const selected = binderCards.find((card) => card.id === selectedId) ?? binderCards[0];
  const listed = DEMO_LISTINGS.find((listing) => listing.cardId === selected?.id);

  function moveSelected() {
    const index = binderIds.indexOf(selectedId);
    if (index <= 0) {
      notify("That card is already in the first pocket.");
      return;
    }
    setBinderIds((current) => {
      const next = [...current];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    notify("Card moved one pocket left.");
  }

  return (
    <section className="demo-view" aria-labelledby="binder-heading">
      <SectionIntro
        eyebrow="MY BINDER / PAGE 01"
        title="A collection that behaves like a collection."
        copy="Select a pocket to inspect a card, move it with a keyboard-friendly control, or follow an owned card into its marketplace listing."
      />
      <div className="binder-toolbar">
        <div><b>{binderCards.length} cards</b><span> · 1 page · public</span></div>
        <div>
          <button className="demo-button demo-button--secondary" type="button" onClick={() => navigate("scanner")}>Add via scanner</button>
          <button className="demo-button demo-button--secondary" type="button" onClick={() => notify("Binder cover changes are simulated in this portfolio build.")}>Edit cover</button>
        </div>
      </div>
      <div className="binder-workspace">
        <div className="binder-shell">
          <div className="binder-rings" aria-hidden="true"><span /><span /><span /><span /></div>
          <div className="binder-page">
            {Array.from({ length: 9 }).map((_, index) => {
              const card = binderCards[index];
              return card ? (
                <button
                  className={`binder-pocket${selected?.id === card.id ? " binder-pocket--selected" : ""}`}
                  type="button"
                  key={card.id}
                  onClick={() => setSelectedId(card.id)}
                  aria-label={`Select ${card.name}, pocket ${index + 1}`}
                >
                  <CardArt card={card} compact />
                  {DEMO_LISTINGS.some((listing) => listing.cardId === card.id) && <span className="listed-dot" title="Listed" />}
                </button>
              ) : (
                <button className="binder-pocket binder-pocket--empty" type="button" key={`empty-${index}`} onClick={() => navigate("scanner")}>
                  <span>+</span>
                  <small>Add card</small>
                </button>
              );
            })}
          </div>
        </div>
        <aside className="binder-detail" aria-label="Selected card details">
          {selected && (
            <>
              <div className="binder-detail-image"><CardArt card={selected} /></div>
              <div className="binder-detail-title"><div><span>{selected.set}</span><h2>{selected.name}</h2></div><DemoChip tone={listed ? "green" : "neutral"}>{listed ? "Listed" : "Binder only"}</DemoChip></div>
              <dl className="detail-grid">
                <div><dt>Number</dt><dd>{selected.number}</dd></div>
                <div><dt>Condition</dt><dd>{selected.condition}</dd></div>
                <div><dt>Rarity</dt><dd>{selected.rarity}</dd></div>
                <div><dt>Language</dt><dd>English</dd></div>
              </dl>
              <div className="detail-actions">
                <button className="demo-button demo-button--secondary" type="button" onClick={moveSelected}>Move left</button>
                {listed ? (
                  <button className="demo-button demo-button--primary" type="button" onClick={() => openListing(listed)}>View listing</button>
                ) : (
                  <button className="demo-button demo-button--primary" type="button" onClick={() => notify("Listing creation is simulated; no marketplace record was created.")}>List card</button>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

type MarketplaceViewProps = {
  openListing: (listing: DemoListing) => void;
  savedListingIds: string[];
  toggleSaved: (id: string) => void;
};

function MarketplaceView({ openListing, savedListingIds, toggleSaved }: MarketplaceViewProps) {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(true);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return DEMO_LISTINGS.filter((listing) => {
      const card = cardById(listing.cardId);
      return (
        (!normalized || `${card.name} ${card.set} ${listing.seller}`.toLowerCase().includes(normalized)) &&
        (condition === "All" || card.condition === condition) &&
        (!availableOnly || listing.status === "Available")
      );
    });
  }, [availableOnly, condition, query]);

  return (
    <section className="demo-view" aria-labelledby="marketplace-heading">
      <SectionIntro
        eyebrow="MARKETPLACE / SAMPLE INVENTORY"
        title="Browse the card, not the noise."
        copy="Search and filter the same card data used across binders, profiles, listings, and conversations. All inventory and prices are illustrative."
      />
      <div className="market-toolbar">
        <label className="demo-field demo-field--search">
          <span>Search marketplace</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Card, set, or seller" />
        </label>
        <label className="demo-field">
          <span>Condition</span>
          <select value={condition} onChange={(event) => setCondition(event.target.value)}>
            <option>All</option><option>NM</option><option>LP</option><option>MP</option>
          </select>
        </label>
        <label className="demo-check">
          <input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
          <span>Available only</span>
        </label>
      </div>
      <div className="market-results-line"><span>{filtered.length} sample listings</span><span>Sorted: recently listed</span></div>
      {filtered.length ? (
        <div className="listing-grid">
          {filtered.map((listing) => {
            const card = cardById(listing.cardId);
            const saved = savedListingIds.includes(listing.id);
            return (
              <article className="listing-card" key={listing.id}>
                <button className="listing-image-button" type="button" onClick={() => openListing(listing)} aria-label={`Open ${card.name} listing`}>
                  <CardArt card={card} />
                </button>
                <div className="listing-card-head">
                  <div><h2>{card.name}</h2><p>{card.set} · {card.number}</p></div>
                  <strong>{money(listing.price)}</strong>
                </div>
                <div className="listing-card-meta"><DemoChip>{card.condition}</DemoChip><DemoChip tone={listing.status === "Available" ? "green" : listing.status === "On hold" ? "gold" : "neutral"}>{listing.status}</DemoChip></div>
                <div className="listing-card-footer">
                  <span>@{listing.seller} · ★ {listing.sellerRating.toFixed(1)}</span>
                  <button type="button" aria-pressed={saved} onClick={() => toggleSaved(listing.id)}>{saved ? "Saved" : "Save"}</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="demo-empty-state"><b>No sample listings match.</b><p>Clear a filter or search for another collector.</p></div>
      )}
    </section>
  );
}

type ListingViewProps = {
  listing: DemoListing;
  saved: boolean;
  toggleSaved: (id: string) => void;
  navigate: (view: DemoView) => void;
  notify: (message: string) => void;
};

function ListingView({ listing, saved, toggleSaved, navigate, notify }: ListingViewProps) {
  const card = cardById(listing.cardId);
  return (
    <section className="demo-view" aria-labelledby="listing-heading">
      <button className="demo-back" type="button" onClick={() => navigate("marketplace")}>← Back to marketplace</button>
      <div className="listing-detail-layout">
        <div className="listing-detail-art"><CardArt card={card} priority /></div>
        <div className="listing-detail-copy">
          <div className="result-topline"><DemoChip tone={listing.status === "Available" ? "green" : "gold"}>{listing.status}</DemoChip><span>Sample listing</span></div>
          <span className="listing-set">{card.set} · {card.number}</span>
          <h1 id="listing-heading">{card.name}</h1>
          <div className="listing-price">{money(listing.price)}</div>
          <div className="listing-attributes"><DemoChip>{card.condition}</DemoChip><DemoChip>{card.rarity}</DemoChip><DemoChip>English</DemoChip></div>
          <div className="seller-card">
            <div className="avatar avatar--mara" aria-hidden="true">MC</div>
            <div><span>Listed by</span><b>{listing.sellerName}</b><small>@{listing.seller} · ★ {listing.sellerRating.toFixed(1)} from 28 reviews</small></div>
            <button type="button" onClick={() => navigate("profile")}>View profile</button>
          </div>
          <div className="listing-notes"><span>Seller notes</span><p>{listing.notes}</p></div>
          <div className="listing-actions">
            <button className="demo-button demo-button--primary" type="button" disabled={listing.status === "Sold"} onClick={() => { navigate("inbox"); notify("Opened the listing-scoped sample conversation."); }}>Message seller</button>
            <button className="demo-button demo-button--secondary" type="button" aria-pressed={saved} onClick={() => toggleSaved(listing.id)}>{saved ? "Saved listing" : "Save listing"}</button>
          </div>
          <p className="simulation-note">Demo action only · no seller is contacted and no transaction is created.</p>
        </div>
      </div>
    </section>
  );
}

function ProfileView({ navigate }: { navigate: (view: DemoView) => void }) {
  return (
    <section className="demo-view" aria-labelledby="profile-heading">
      <div className="profile-header">
        <div className="avatar avatar--large avatar--mara" aria-hidden="true">MC</div>
        <div className="profile-identity">
          <span>COLLECTOR PROFILE / PUBLIC BINDER</span>
          <h1 id="profile-heading">Mara Chen <small>@foilfiend</small></h1>
          <p>Vintage fire-type collector. Careful grading, clear photos, and direct conversations.</p>
          <div className="profile-meta"><span>Toronto, Canada</span><span>★ 4.9 · 28 reviews</span><span>Member since 2026</span></div>
        </div>
        <button className="demo-button demo-button--secondary" type="button" onClick={() => navigate("inbox")}>Message collector</button>
      </div>
      <div className="profile-stats">
        <div><strong>146</strong><span>cards owned</span></div>
        <div><strong>12</strong><span>active listings</span></div>
        <div><strong>34</strong><span>completed trades</span></div>
        <div><strong>4.9</strong><span>average rating</span></div>
      </div>
      <div className="profile-columns">
        <div className="profile-binder-preview">
          <div className="profile-section-head"><div><span>FEATURED BINDER PAGE</span><h2>Base Set favorites</h2></div><button type="button" onClick={() => navigate("binder")}>Open binder →</button></div>
          <div className="profile-card-row">
            {DEMO_CARDS.slice(0, 5).map((card) => <CardArt card={card} compact key={card.id} />)}
          </div>
        </div>
        <aside className="profile-review-preview">
          <span>RECENT REVIEWS</span>
          <div className="review-summary"><strong>4.9</strong><div><b aria-label="5 out of 5 stars">★★★★★</b><small>28 verified reviews</small></div></div>
          <blockquote>“Accurate condition notes and careful packaging. Exactly the collector you want to deal with.”</blockquote>
          <cite>— @kintsugi · buyer</cite>
          <button className="demo-text-button" type="button" onClick={() => navigate("reviews")}>View all reviews →</button>
        </aside>
      </div>
    </section>
  );
}

type InboxViewProps = {
  messages: DemoMessage[];
  setMessages: React.Dispatch<React.SetStateAction<DemoMessage[]>>;
  notify: (message: string) => void;
};

function InboxView({ messages, setMessages, notify }: InboxViewProps) {
  const [draft, setDraft] = useState("");

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setMessages((current) => [...current, { id: `visitor-${Date.now()}`, from: "visitor", body, time: "Now" }]);
    setDraft("");
    notify("Sample message added locally. No seller was contacted.");
  }

  return (
    <section className="demo-view demo-view--inbox" aria-labelledby="inbox-heading">
      <SectionIntro eyebrow="INBOX / LISTING-SCOPED CHAT" title="Conversations stay attached to the card." copy="This sample thread demonstrates the original conversation model. Sending a message only updates local browser state." />
      <div className="inbox-layout">
        <aside className="conversation-list" aria-label="Sample conversations">
          <button className="conversation-row conversation-row--active" type="button">
            <CardArt card={DEMO_CARDS[0]} compact />
            <div><b>Charizard · Base Set</b><span>@foilfiend</span><p>I can also hold it until…</p></div>
            <small>4m</small>
          </button>
          <button className="conversation-row" type="button" onClick={() => notify("That sample conversation is read-only in this demo.")}>
            <CardArt card={DEMO_CARDS[1]} compact />
            <div><b>Mewtwo · Base Set</b><span>@kintsugi</span><p>Thanks for the quick reply.</p></div>
            <small>1d</small>
          </button>
        </aside>
        <div className="chat-panel">
          <header className="chat-header">
            <div><span>Charizard · Base Set 4/102</span><b>@foilfiend</b></div>
            <div><strong>{money(892)}</strong><DemoChip tone="green">Available</DemoChip></div>
          </header>
          <div className="message-stream" aria-live="polite">
            <div className="date-divider"><span>Today</span></div>
            {messages.map((message) => (
              <div className={`message-row message-row--${message.from}`} key={message.id}>
                <div className="message-bubble"><p>{message.body}</p><time>{message.time}</time></div>
              </div>
            ))}
          </div>
          <form className="message-form" onSubmit={sendMessage}>
            <label htmlFor="demo-message">Message @foilfiend</label>
            <div><input id="demo-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a simulated message…" maxLength={280} /><button type="submit">Send</button></div>
            <small>Demo only · messages never leave this browser.</small>
          </form>
        </div>
      </div>
    </section>
  );
}

type NotificationsViewProps = {
  notifications: DemoNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<DemoNotification[]>>;
  navigate: (view: DemoView) => void;
};

function NotificationsView({ notifications, setNotifications, navigate }: NotificationsViewProps) {
  const unread = notifications.filter((notification) => !notification.read).length;
  function markAllRead() {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }
  function openNotification(notification: DemoNotification) {
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
    navigate(notification.kind === "message" ? "inbox" : notification.kind === "listing" ? "listing" : "reviews");
  }
  return (
    <section className="demo-view" aria-labelledby="notifications-heading">
      <SectionIntro eyebrow="NOTIFICATIONS / LOCAL STATE" title="Keep every marketplace event in view." copy="Open a notification to follow its product context, or clear the unread state. Nothing is synchronized beyond this browser." />
      <div className="notification-toolbar"><span>{unread} unread</span><button className="demo-text-button" type="button" onClick={markAllRead} disabled={!unread}>Mark all as read</button></div>
      <div className="notification-list">
        {notifications.map((notification) => (
          <button className={`notification-row${notification.read ? "" : " notification-row--unread"}`} type="button" key={notification.id} onClick={() => openNotification(notification)}>
            <span className={`notification-symbol notification-symbol--${notification.kind}`} aria-hidden="true">{notification.kind === "message" ? "↗" : notification.kind === "listing" ? "$" : "★"}</span>
            <span><b>{notification.text}</b><small>{notification.time} ago · open sample context</small></span>
            {!notification.read && <i aria-label="Unread" />}
          </button>
        ))}
      </div>
    </section>
  );
}

function ReviewsView({ notify }: { notify: (message: string) => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) {
      notify("Choose a star rating before submitting the sample review.");
      return;
    }
    setSubmitted(true);
    notify("Sample review added locally. No profile was changed.");
  }
  return (
    <section className="demo-view" aria-labelledby="reviews-heading">
      <SectionIntro eyebrow="REVIEWS / MARKETPLACE TRUST" title="Close the loop after a completed trade." copy="Reviews are attached to completed listing relationships in the original system. This form is a browser-only simulation." />
      <div className="reviews-layout">
        <div className="reviews-overview">
          <div className="rating-hero"><strong>4.9</strong><div><b aria-label="4.9 out of 5 stars">★★★★★</b><span>28 collector reviews</span></div></div>
          <div className="rating-bars" aria-label="Rating distribution">
            {[5, 4, 3, 2, 1].map((star) => <div key={star}><span>{star}★</span><i><b style={{ width: star === 5 ? "86%" : star === 4 ? "11%" : star === 3 ? "3%" : "0%" }} /></i></div>)}
          </div>
          <article className="review-card"><div><b>@kintsugi</b><span aria-label="5 out of 5 stars">★★★★★</span></div><p>Accurate condition notes and careful packaging. Exactly the collector you want to deal with.</p><small>Buyer · Charizard, Base Set · 2 days ago</small></article>
          <article className="review-card"><div><b>@ashen_lake</b><span aria-label="5 out of 5 stars">★★★★★</span></div><p>Fast, clear communication from first question to handoff.</p><small>Seller · Blastoise, Base Set · 1 week ago</small></article>
        </div>
        <form className="review-form" onSubmit={submitReview}>
          <span>LEAVE A SAMPLE REVIEW</span>
          <h2>How was the trade?</h2>
          <p>For demo purposes, this review is eligible and tied to the sample Charizard listing.</p>
          <fieldset disabled={submitted}>
            <legend>Rating</legend>
            <div className="star-picker">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" aria-label={`${star} star${star === 1 ? "" : "s"}`} aria-pressed={rating === star} onClick={() => setRating(star)}>{star <= rating ? "★" : "☆"}</button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="review-comment">Review</label>
          <textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Describe the condition, communication, or handoff…" maxLength={500} disabled={submitted} />
          <div className="review-form-footer"><small>{comment.length}/500 · stored nowhere</small><button className="demo-button demo-button--primary" type="submit" disabled={submitted}>{submitted ? "Sample review submitted" : "Submit sample review"}</button></div>
        </form>
      </div>
    </section>
  );
}

export function DemoApp() {
  const [view, setView] = useState<DemoView>("binder");
  const [state, setState] = useState<StoredDemoState>(initialStoredState);
  const [hydrated, setHydrated] = useState(false);
  const [selectedListing, setSelectedListing] = useState<DemoListing>(DEMO_LISTINGS[0]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (isDemoView(hash)) setView(hash);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setState({ ...initialStoredState, ...(JSON.parse(stored) as StoredDemoState) });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function navigate(nextView: DemoView) {
    setView(nextView);
    window.history.replaceState(null, "", `#${nextView}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(".demo-content")?.focus({ preventScroll: true });
    });
  }

  function openListing(listing: DemoListing) {
    setSelectedListing(listing);
    navigate("listing");
  }

  function toggleSaved(id: string) {
    setState((current) => ({
      ...current,
      savedListingIds: current.savedListingIds.includes(id)
        ? current.savedListingIds.filter((listingId) => listingId !== id)
        : [...current.savedListingIds, id],
    }));
    setToast(state.savedListingIds.includes(id) ? "Removed from saved listings." : "Saved locally for this demo.");
  }

  function addScannedCard() {
    setState((current) => ({
      ...current,
      binderIds: current.binderIds.includes(SCAN_CARD.id) ? current.binderIds : [...current.binderIds, SCAN_CARD.id],
    }));
    setToast("Pikachu added to the next open binder pocket.");
  }

  function resetDemo() {
    setState(initialStoredState);
    setSelectedListing(DEMO_LISTINGS[0]);
    window.localStorage.removeItem(STORAGE_KEY);
    setToast("Demo state reset.");
  }

  const unreadCount = state.notifications.filter((notification) => !notification.read).length;
  const currentLabel = DEMO_NAV.find((item) => item.id === view)?.label ?? "Demo";

  return (
    <div className="demo-app">
      <header className="demo-header">
        <Brand href="/" compact />
        <div className="demo-header-context"><DemoChip tone="green">Interactive demo</DemoChip><span>Sample data · local actions</span></div>
        <div className="demo-header-actions">
          <button type="button" onClick={resetDemo}>Reset demo</button>
          <Link href="/">Portfolio <span aria-hidden="true">↗</span></Link>
        </div>
      </header>
      <div className="demo-body">
        <aside className="demo-sidebar">
          <div className="demo-sidebar-label">PRODUCT AREAS</div>
          <nav aria-label="Demo product areas">
            {DEMO_NAV.map((item, index) => (
              <button key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={view === item.id ? "page" : undefined}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{item.label}</b>
                {item.id === "notifications" && unreadCount > 0 && <i aria-label={`${unreadCount} unread`}>{unreadCount}</i>}
              </button>
            ))}
          </nav>
          <div className="demo-sidebar-note"><span className="status-dot" /><p><b>No live services.</b><br />This showcase never calls the original API, scanner, database, cache, or AWS account.</p></div>
        </aside>
        <div className="demo-mobile-nav" aria-label="Demo product areas">
          {DEMO_NAV.map((item) => <button key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={view === item.id ? "page" : undefined}>{item.short}{item.id === "notifications" && unreadCount > 0 ? ` ${unreadCount}` : ""}</button>)}
        </div>
        <main className="demo-content" id="main-content" tabIndex={-1}>
          <div className="demo-mobile-title">Viewing: <b>{currentLabel}</b></div>
          {view === "scanner" && <ScannerView binderIds={state.binderIds} addScannedCard={addScannedCard} notify={setToast} />}
          {view === "binder" && <BinderView binderIds={state.binderIds} setBinderIds={(updater) => setState((current) => ({ ...current, binderIds: typeof updater === "function" ? updater(current.binderIds) : updater }))} openListing={openListing} navigate={navigate} notify={setToast} />}
          {view === "marketplace" && <MarketplaceView openListing={openListing} savedListingIds={state.savedListingIds} toggleSaved={toggleSaved} />}
          {view === "listing" && <ListingView listing={selectedListing} saved={state.savedListingIds.includes(selectedListing.id)} toggleSaved={toggleSaved} navigate={navigate} notify={setToast} />}
          {view === "profile" && <ProfileView navigate={navigate} />}
          {view === "inbox" && <InboxView messages={state.messages} setMessages={(updater) => setState((current) => ({ ...current, messages: typeof updater === "function" ? updater(current.messages) : updater }))} notify={setToast} />}
          {view === "notifications" && <NotificationsView notifications={state.notifications} setNotifications={(updater) => setState((current) => ({ ...current, notifications: typeof updater === "function" ? updater(current.notifications) : updater }))} navigate={navigate} />}
          {view === "reviews" && <ReviewsView notify={setToast} />}
        </main>
      </div>
      <div className={`demo-toast${toast ? " demo-toast--visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
