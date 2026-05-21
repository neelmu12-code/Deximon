import type { Metadata } from "next";
import "./globals.css";

// Root layout — intentionally just <html>/<body>. The actual page chrome
// (nav, footer, centered auth shell, etc.) lives in the route-group
// layouts under src/app/(app) and src/app/(auth) so that signed-in and
// signed-out flows can render completely different shells without one
// having to opt out of the other.

export const metadata: Metadata = {
  title: "Deximon",
  description: "Social digital binder + marketplace for Pokémon TCG collectors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
