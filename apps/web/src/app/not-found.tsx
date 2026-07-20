import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6 py-16 text-ink">
      <div className="w-full max-w-lg rounded-2xl border border-hair bg-surface p-8 text-center shadow-2xl">
        <Wordmark size="lg" />
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.28em] text-dx-red">404</p>
        <h1 className="mt-3 text-3xl font-bold">Page not found</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink2">
          This page may have moved, or the link might be incorrect.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-10 items-center justify-center rounded-md bg-dx-red px-5 text-sm font-semibold text-white transition-colors hover:bg-dx-red-hover"
        >
          Back to Deximon
        </Link>
      </div>
    </main>
  );
}
