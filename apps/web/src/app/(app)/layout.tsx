import { Nav } from "@/components/Nav";

/**
 * (app) route-group layout.
 *
 * Shell for every signed-in page plus the publicly browsable pages
 * (home, public profiles, marketplace, listing detail). All of these
 * share the same top nav and content container; only the *gated*
 * subset (binder, inbox, notifications, settings) actually requires a
 * session — that gating happens in src/middleware.ts, not here, so
 * this layout stays purely visual.
 *
 * The route group `(app)` doesn't show up in the URL, so:
 *   src/app/(app)/page.tsx                  →  /
 *   src/app/(app)/binder/page.tsx           →  /binder
 *   src/app/(app)/u/[username]/page.tsx     →  /u/:username
 *   ...etc
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
