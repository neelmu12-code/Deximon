/**
 * (auth) route-group layout.
 *
 * Shell for the signed-out pages: /login and /signup. Renders a single
 * centered column with the wordmark on top and the form (page content)
 * underneath. No top nav, no footer, no links into the rest of the app
 * — anyone here is either logging in or signing up, and we don't want
 * to invite them to wander into protected pages that will just bounce
 * them back here.
 *
 * The route group `(auth)` doesn't show up in the URL, so:
 *   src/app/(auth)/login/page.tsx  →  /login
 *   src/app/(auth)/signup/page.tsx →  /signup
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">Deximon</h1>
        {children}
      </div>
    </div>
  );
}
