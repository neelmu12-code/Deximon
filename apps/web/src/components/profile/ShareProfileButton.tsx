"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "error";

function legacyCopy(text: string): boolean {
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(input);
  return copied;
}

export function ShareProfileButton({ username }: { username: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function copyProfileUrl() {
    const url = `${window.location.origin}/u/${encodeURIComponent(username)}`;

    try {
      const copied = navigator.clipboard
        ? await navigator.clipboard.writeText(url).then(() => true)
        : legacyCopy(url);
      setCopyState(copied ? "copied" : "error");
    } catch {
      setCopyState(legacyCopy(url) ? "copied" : "error");
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyState("idle"), 2400);
  }

  return (
    <>
      <button
        type="button"
        onClick={copyProfileUrl}
        className="inline-flex h-10 items-center justify-center rounded-md border border-hair bg-transparent px-4 text-sm font-medium text-ink transition-colors hover:bg-surface2"
      >
        {copyState === "copied" ? "Link copied" : "Share profile"}
      </button>

      {copyState !== "idle" && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-3 text-sm shadow-xl ${
            copyState === "copied"
              ? "border-[#1c4a33] bg-[#0f2a1d] text-[#8bdcae]"
              : "border-[#5a1a1f] bg-[#2a0d10] text-[#ff8a8e]"
          }`}
        >
          {copyState === "copied" ? "Link copied" : "Could not copy the profile link."}
        </div>
      )}
    </>
  );
}
