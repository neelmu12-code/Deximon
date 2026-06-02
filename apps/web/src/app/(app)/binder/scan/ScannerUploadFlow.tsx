"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";

type HoloType = "normal" | "holo" | "reverse_holo";

type ScanCandidate = {
  name: string;
  set_name: string;
  number: string;
  rarity: string;
  image_url?: string | null;
  confidence: number;
};

type ConfirmedCard = ScanCandidate & {
  holo_type: HoloType;
  condition: string;
  language: string;
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const MOCK_CANDIDATES: ScanCandidate[] = [
  {
    name: "Pikachu",
    set_name: "Base Set",
    number: "58/102",
    rarity: "Common",
    image_url: "https://images.pokemontcg.io/base1/58.png",
    confidence: 0.92,
  },
  {
    name: "Charizard",
    set_name: "Base Set",
    number: "4/102",
    rarity: "Rare Holo",
    image_url: "https://images.pokemontcg.io/base1/4.png",
    confidence: 0.88,
  },
  {
    name: "Mewtwo",
    set_name: "Base Set",
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
    number: String(data.number),
    rarity: String(data.rarity),
    image_url: data.image_url ? String(data.image_url) : null,
    confidence: Number(data.confidence),
  };
}

export function ScannerUploadFlow() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [candidate, setCandidate] = useState<ScanCandidate | null>(null);
  const [form, setForm] = useState<ConfirmedCard | null>(null);
  const [savedCards, setSavedCards] = useState<ConfirmedCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mockNotice, setMockNotice] = useState<string | null>(null);

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

  function chooseFile(file: File | undefined) {
    setError(null);
    setSuccess(null);
    setCandidate(null);
    setForm(null);
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
      const scannedCandidate = normalizeCandidate(response);
      setCandidate(scannedCandidate);
      setForm({
        ...scannedCandidate,
        holo_type: scannedCandidate.rarity.toLowerCase().includes("holo") ? "holo" : "normal",
        condition: "NM",
        language: "EN",
      });
    } catch (scanError) {
      if (scanError instanceof ApiError && ![404, 405].includes(scanError.status)) {
        setError(messageFromError(scanError));
      } else {
        const fallback = mockCandidateForFile(selectedFile);
        setCandidate(fallback);
        setForm({
          ...fallback,
          holo_type: fallback.rarity.toLowerCase().includes("holo") ? "holo" : "normal",
          condition: "NM",
          language: "EN",
        });
        setMockNotice("Using temporary mock scan data because /scan/mock is not available yet.");
      }
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO(scanner-binder-api): replace this local fallback with the real
      // authenticated binder/card create endpoint once the collection API ships.
      await new Promise((resolve) => setTimeout(resolve, 250));
      setSavedCards((cards) => [form, ...cards]);
      setSuccess("Card saved locally for this session. Binder API integration is still pending.");
    } catch (saveError) {
      setError(messageFromError(saveError));
    } finally {
      setSaving(false);
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

      {candidate && form && (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl border border-hair bg-surface p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink3 mb-3">Scanner candidate</div>
            {candidate.image_url && (
              <div className="relative mx-auto mb-4 aspect-[5/7] max-w-[180px] overflow-hidden rounded-lg bg-surface2">
                <Image src={candidate.image_url} alt={candidate.name} fill className="object-contain" sizes="180px" />
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
                Edit anything the mock scanner got wrong, then save it to the binder flow.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2" />
              </label>
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Set name</span>
                <input value={form.set_name} onChange={(e) => setForm({ ...form, set_name: e.target.value })} required className="h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2" />
              </label>
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Number</span>
                <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required className="h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2" />
              </label>
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Rarity</span>
                <input value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })} required className="h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2" />
              </label>
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Holo type</span>
                <select value={form.holo_type} onChange={(e) => setForm({ ...form, holo_type: e.target.value as HoloType })} className="h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2">
                  <option value="normal">Normal</option>
                  <option value="holo">Holo</option>
                  <option value="reverse_holo">Reverse holo</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Condition</span>
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2">
                  <option value="NM">Near Mint</option>
                  <option value="LP">Lightly Played</option>
                  <option value="MP">Moderately Played</option>
                  <option value="HP">Heavily Played</option>
                  <option value="DMG">Damaged</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Language</span>
                <input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value.toUpperCase() })} maxLength={10} required className="h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2" />
              </label>
            </div>

            <div className="rounded-md border border-hair bg-surface2 px-3 py-2 text-[12px] text-ink3">
              TODO: replace temporary local save with the real authenticated binder/card endpoint once it exists.
            </div>

            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-md bg-dx-red px-4 text-sm font-medium text-white transition-colors hover:bg-dx-red-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save to binder"}
            </button>
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
                <span className="text-ink3">{card.set_name} - {card.number} - {card.condition} - {card.language}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
