import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Deximon</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Social digital binder + marketplace for Pokémon TCG collectors. Scan a
          card, organize your binder, and trade or sell with other collectors.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-deximon px-4 py-2 text-sm font-medium text-white hover:bg-deximon-dark"
        >
          Create an account
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Log in
        </Link>
        <Link
          href="/market"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Browse marketplace
        </Link>
      </div>

      {/* Dev convenience: local service health endpoints. Safe to remove
          once we're deployed and these aren't running on localhost. */}
      <div className="border-t border-neutral-200 pt-6 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
        <p className="mb-2 font-medium text-neutral-700 dark:text-neutral-300">Local dev</p>
        <ul className="list-disc pl-6">
          <li>
            API health:{" "}
            <a className="text-deximon hover:underline" href="http://localhost:8000/healthz">
              localhost:8000/healthz
            </a>
          </li>
          <li>
            Scanner health:{" "}
            <a className="text-deximon hover:underline" href="http://localhost:8001/healthz">
              localhost:8001/healthz
            </a>
          </li>
          <li>
            API docs:{" "}
            <a className="text-deximon hover:underline" href="http://localhost:8000/docs">
              localhost:8000/docs
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
