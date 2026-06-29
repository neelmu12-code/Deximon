"use client";

import { useState } from "react";
import Image from "next/image";
import { ConfirmCardFields } from "./ConfirmCardFields";
import {
  defaultDetails,
  normalizeLanguage,
  type CardDetails,
  type CardIdentity,
} from "@/lib/cardDetails";

type Props = {
  identity: CardIdentity;
  initial?: CardDetails;
  saving?: boolean;
  error?: string | null;
  onConfirm: (details: CardDetails) => void;
  onClose: () => void;
  // Optional secondary action (e.g. go back to the search modal).
  onSearchAgain?: () => void;
};

/**
 * Reusable confirmation popup shown after a card is picked from search. Used by
 * the binder manual-add flow and the scanner's "search manually instead" path.
 * It only collects the editable details and hands them back via onConfirm — the
 * caller owns the actual save so the modal stays flow-agnostic.
 */
export function ConfirmCardModal({
  identity,
  initial,
  saving = false,
  error,
  onConfirm,
  onClose,
  onSearchAgain,
}: Props) {
  const [details, setDetails] = useState<CardDetails>(() => {
    const base = initial ?? defaultDetails({});
    return { ...base, language: normalizeLanguage(base.language) };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={saving ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-[640px] max-h-[88vh] overflow-y-auto bg-surface border border-hair rounded-xl shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-hair">
          <div>
            <h2 className="text-lg font-semibold text-ink">Confirm card details</h2>
            <p className="text-sm text-ink2">
              Name, set, and number come from the catalog. Set the details we can&apos;t read off a
              scan, then save to your binder.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="text-ink3 hover:text-ink transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          className="p-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(details);
          }}
        >
          <div className="flex gap-4">
            {identity.image_url && (
              <div className="relative aspect-[5/7] w-[110px] shrink-0 overflow-hidden rounded-lg border border-hair bg-surface2">
                <Image
                  src={identity.image_url}
                  alt={identity.name}
                  fill
                  className="object-contain"
                  sizes="110px"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <ConfirmCardFields identity={identity} value={details} onChange={setDetails} />
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-dx-red/40 bg-dx-red/10 px-3 py-2 text-sm text-dx-red">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-md bg-dx-red px-4 text-sm font-medium text-white transition-colors hover:bg-dx-red-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save to binder"}
            </button>
            {onSearchAgain && (
              <button
                type="button"
                onClick={onSearchAgain}
                disabled={saving}
                className="h-10 rounded-md border border-hair bg-surface2 px-4 text-sm text-ink2 hover:text-ink hover:border-ink3 transition-colors disabled:opacity-50"
              >
                Search again
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
