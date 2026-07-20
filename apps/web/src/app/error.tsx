"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Wordmark } from "@/components/Wordmark";

export default function ErrorPage({
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
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-hair bg-surface p-8 text-center shadow-2xl">
        <Wordmark size="lg" />
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.28em] text-dx-red">500</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink2">
          Deximon hit an unexpected error. Try the request again or return home.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-md bg-dx-red px-5 text-sm font-semibold text-white transition-colors hover:bg-dx-red-hover"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-hair px-5 text-sm font-medium text-ink transition-colors hover:bg-surface2"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
