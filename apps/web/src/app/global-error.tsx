"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-[#0b0b0e] px-6 text-[#f2f2f0]">
        <main className="w-full max-w-lg rounded-2xl border border-[#2a2a2f] bg-[#15151a] p-8 text-center shadow-2xl">
          <p className="text-3xl font-extrabold tracking-tight">Deximon</p>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.28em] text-[#d8232a]">500</p>
          <h1 className="mt-3 text-3xl font-bold">Deximon could not load</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#9ca3af]">
            An unexpected application error occurred. Retry to reload the experience.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-7 inline-flex h-10 items-center justify-center rounded-md bg-[#d8232a] px-5 text-sm font-semibold text-white hover:bg-[#b71c2c]"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
