"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import { ConfirmCardFields } from "@/components/binder/ConfirmCardFields";
import { ManualAddModal } from "@/components/binder/ManualAddModal";
import { ConfirmCardModal } from "@/components/binder/ConfirmCardModal";
import {
  defaultDetails,
  languageLabel,
  type CardDetails,
  type CardIdentity,
  type SearchCard,
} from "@/lib/cardDetails";

type ScanCandidate = {
  id?: string;
  name: string;
  set_name: string;
  set_code?: string | null;
  number: string;
  rarity: string;
  image_url?: string | null;
  confidence: number;
};

type OwnedCard = {
  id: string;
  name: string;
};

type SavedCard = {
  name: string;
  set_name: string;
  number: string;
  condition: string;
  language: string;
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const MOCK_CANDIDATES: ScanCandidate[] = [
  {
    name: "Pikachu",
    set_name: "Base Set",
    set_code: "base1",
    number: "58/102",
    rarity: "Common",
    image_url: "https://images.pokemontcg.io/base1/58.png",
    confidence: 0.92,
  },
  {
    name: "Charizard",
    set_name: "Base Set",
    set_code: "base1",
    number: "4/102",
    rarity: "Rare Holo",
    image_url: "https://images.pokemontcg.io/base1/4.png",
    confidence: 0.88,
  },
  {
    name: "Mewtwo",
    set_name: "Base Set",
    set_code: "base1",
    number: "10/102",
    rarity: "Rare Holo",
    image_url: "https://images.pokemontcg.io/base1/10.png",
    confidence: 0.9,
  },
];

function mockCandidateForFile(file: File): ScanCandidate {
  const index = Array.from(file.name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % MOCK_CANDIDATES.length;
  return MOCK_CANDIDATES[index];
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function validateImageFile(file: File): string | null {
  if (ALLOWED_TYPES.has(file.type)) return null;
  if (!file.type && ALLOWED_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension))) {
    return null;
  }
  return "Please upload a JPG, JPEG, PNG, or WebP image.";
}

function normalizeCandidate(payload: unknown): ScanCandidate {
  const candidate =
    payload && typeof payload === "object" && "candidate" in payload
      ? (payload as { candidate: unknown }).candidate
      : payload;

  if (!candidate || typeof candidate !== "object") {
    throw new Error("Scanner response did not include a candidate.");
  }

  const data = candidate as Partial<ScanCandidate>;
  if (!data.name || !data.set_name || !data.number || !data.rarity || data.confidence == null) {
    throw new Error("Scanner response is missing required candidate fields.");
  }

  return {
    name: String(data.name),
    set_name: String(data.set_name),
    set_code: data.set_code ? String(data.set_code) : null,
    number: String(data.number),
    rarity: String(data.rarity),
    image_url: data.image_url ? String(data.image_url) : null,
    confidence: Number(data.confidence),
  };
}

function identityFromCandidate(candidate: ScanCandidate): CardIdentity {
  return {
    name: candidate.name,
    set_name: candidate.set_name,
    set_code: candidate.set_code ?? null,
    number: candidate.number,
    image_url: candidate.image_url ?? null,
  };
}

function identityFromSearch(card: SearchCard): CardIdentity {
  return {
    name: card.name,
    set_name: card.set_name,
    set_code: card.set || null,
    number: card.num,
    image_url: card.image || null,
  };
}

// Both the inline confirm and the "search manually" popup save the same way:
// create an owned card, which the backend auto-places into the next free slot.
async function persistCard(identity: CardIdentity, details: CardDetails): Promise<void> {
  const saved = await fetchAPI<OwnedCard>("/binder/cards", {
    method: "POST",
    body: {
      name: identity.name,
      set_code: identity.set_code || identity.set_name || null,
      number: identity.number || null,
      rarity: details.rarity,
      condition: details.condition,
      language: details.language,
      holo_type: details.holo_type,
      image_url: identity.image_url ?? null,
    },
  });
  if (!saved) throw new Error("Binder did not return the saved card.");
}

export function ScannerUploadFlow() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [candidate, setCandidate] = useState<ScanCandidate | null>(null);
  const [identity, setIdentity] = useState<CardIdentity | null>(null);
  const [details, setDetails] = useState<CardDetails | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mockNotice, setMockNotice] = useState<string | null>(null);

  // "Search manually instead" flow.
  const [showSearch, setShowSearch] = useState(false);
  const [searchPicked, setSearchPicked] = useState<SearchCard | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const canScan = useMemo(() => Boolean(selectedFile) && !scanning, [scanning, selectedFile]);

  function applyCandidate(scanned: ScanCandidate) {
    setCandidate(scanned);
    setIdentity(identityFromCandidate(scanned));
    setDetails(defaultDetails({ rarity: scanned.rarity }));
  }

  function chooseFile(file: File | undefined) {
    setError(null);
    setSuccess(null);
    setCandidate(null);
    setIdentity(null);
    setDetails(null);
    setMockNotice(null);

    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      return;
    }
    setSelectedFile(file);
  }

  async function handleScan() {
    if (!selectedFile) return;
    setScanning(true);
    setError(null);
    setSuccess(null);
    setMockNotice(null);

    try {
      const body = new FormData();
      body.append("file", selectedFile);
      const response = await fetchAPI<unknown>("/scan/mock", { method: "POST", body });
      applyCandidate(normalizeCandidate(response));
    } catch (scanError) {
      if (scanError instanceof ApiError && ![404, 405].includes(scanError.status)) {
        setError(messageFromError(scanError));
      } else {
        applyCandidate(mockCandidateForFile(selectedFile));
        setMockNotice("Using temporary mock scan data because /scan/mock is not available yet.");
      }
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (!identity || !details) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await persistCard(identity, details);
      setSavedCards((cards) => [
        {
          name: identity.name,
          set_name: identity.set_name,
          number: identity.number,
          condition: details.condition,
          language: details.language,
        },
        ...cards,
      ]);
      setSuccess("Card saved to your binder.");
    } catch (saveError) {
      setError(messageFromError(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleManualConfirm(confirmed: CardDetails) {
    if (!searchPicked) return;
    setModalSaving(true);
    setModalError(null);
    const pickedIdentity = identityFromSearch(searchPicked);
    try {
      await persistCard(pickedIdentity, confirmed);
      setSavedCards((cards) => [
        {
          name: pickedIdentity.name,
          set_name: pickedIdentity.set_name,
          number: pickedIdentity.number,
          condition: confirmed.condition,
          language: confirmed.language,
        },
        ...cards,
      ]);
      setSearchPicked(null);
      setSuccess("Card saved to your binder.");
    } catch (saveError) {
      setModalError(messageFromError(saveError));
    } finally {
      setModalSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          chooseFile(event.dataTransfer.files[0]);
        }}
        className={`rounded border border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-dx-red bg-dx-red/10"
            : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />

        <div className="space-y-3">
          <p className="text-sm text-ink2">
            Drop a card photo here, take a photo on mobile, or choose an image from your device.
          </p>
          <p className="text-[12px] text-ink3">Supported files: JPG, JPEG, PNG, WebP.</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-dx-red px-4 text-sm font-medium text-white transition-colors hover:bg-dx-red-hover"
          >
            Choose or take photo
          </button>
        </div>
      </div>

      {previewUrl && selectedFile && (
        <div className="rounded-xl border border-hair bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">{selectedFile.name}</div>
              <div className="text-[12px] text-ink3">{Math.round(selectedFile.size / 1024)} KB</div>
            </div>
            <button
              type="button"
              onClick={handleScan}
              disabled={!canScan}
              className="h-10 rounded-md bg-dx-red px-4 text-sm font-medium text-white transition-colors hover:bg-dx-red-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scanning ? "Scanning..." : "Scan card"}
            </button>
          </div>
          <div className="relative mx-auto aspect-[5/7] max-w-[260px] overflow-hidden rounded-lg border border-hair bg-surface2">
            <Image src={previewUrl} alt="Selected card preview" fill className="object-contain" unoptimized />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-dx-red/40 bg-dx-red/10 px-3 py-2 text-sm text-dx-red">
          {error}
        </div>
      )}
      {mockNotice && (
        <div className="rounded-md border border-dx-gold/40 bg-dx-gold/10 px-3 py-2 text-sm text-dx-gold">
          {mockNotice}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-dx-green/40 bg-dx-green/10 px-3 py-2 text-sm text-dx-green">
          {success}
        </div>
      )}

      {candidate && identity && details && (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl border border-hair bg-surface p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink3 mb-3">Scanner candidate</div>
            {candidate.image_url && (
              <div className="relative mx-auto mb-4 aspect-[5/7] max-w-[180px] overflow-hidden rounded-lg bg-surface2">
                <Image src={candidate.image_url} alt={candidate.name} fill className="object-contain" sizes="180px" unoptimized />
              </div>
            )}
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink3">Name</dt>
                <dd className="font-medium text-ink text-right">{candidate.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink3">Set</dt>
                <dd className="font-medium text-ink text-right">{candidate.set_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink3">Number</dt>
                <dd className="font-medium text-ink text-right">{candidate.number}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink3">Rarity</dt>
                <dd className="font-medium text-ink text-right">{candidate.rarity}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink3">Confidence</dt>
                <dd className="font-medium text-dx-green text-right">{Math.round(candidate.confidence * 100)}%</dd>
              </div>
            </dl>
          </div>

          <form
            className="rounded-xl border border-hair bg-surface p-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <div>
              <h2 className="text-lg font-semibold text-ink">Confirm card details</h2>
              <p className="text-sm text-ink2">
                Name, set, and number come from the catalog. Set the details we can&apos;t read off a
                scan, then save it to your binder.
              </p>
            </div>

            <ConfirmCardFields identity={identity} value={details} onChange={setDetails} />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-md bg-dx-red px-4 text-sm font-medium text-white transition-colors hover:bg-dx-red-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save to binder"}
              </button>
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="h-10 rounded-md border border-hair bg-surface2 px-4 text-sm text-ink2 hover:text-ink hover:border-ink3 transition-colors"
              >
                Search manually instead
              </button>
            </div>
          </form>
        </div>
      )}

      {savedCards.length > 0 && (
        <div className="rounded-xl border border-hair bg-surface p-5">
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink3 mb-3">Saved this session</div>
          <div className="space-y-2">
            {savedCards.map((card, index) => (
              <div key={`${card.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface2 px-3 py-2 text-sm">
                <span className="font-medium text-ink">{card.name}</span>
                <span className="text-ink3">{card.set_name} - {card.number} - {card.condition} - {languageLabel(card.language)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSearch && (
        <ManualAddModal
          onPick={(card) => {
            setSearchPicked(card);
            setShowSearch(false);
            setModalError(null);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
      {searchPicked && (
        <ConfirmCardModal
          identity={identityFromSearch(searchPicked)}
          initial={defaultDetails({ rarity: searchPicked.rarity })}
          saving={modalSaving}
          error={modalError}
          onConfirm={handleManualConfirm}
          onClose={() => {
            setSearchPicked(null);
            setModalError(null);
          }}
          onSearchAgain={() => {
            setSearchPicked(null);
            setModalError(null);
            setShowSearch(true);
          }}
        />
      )}
    </div>
  );
}
