import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth gate — STUB.
 *
 * Currently this middleware passes every request through unchanged.
 * The `matcher` config at the bottom of the file lists exactly which
 * routes will be gated once a real session check is wired in; outside
 * of those routes this file never runs (Next.js skips middleware
 * entirely for non-matching paths), so home/marketplace/listing-detail
 * /public-profile/login/signup stay open to anonymous visitors with no
 * extra logic here.
 *
 * Why it's a stub right now: there's no auth backend yet. If we
 * actually rejected unauthenticated requests, every teammate would be
 * locked out of their own dev environment. The structure is here so
 * that when the auth service lands, the only work needed is to fill in
 * the body — no rerouting, no rethinking which pages are protected.
 *
 * When the auth service is live, replace the body with something like:
 *   1. Read the session cookie (or Authorization header).
 *   2. Verify the JWT signature / call /me to validate.
 *   3. On failure, return NextResponse.redirect with
 *      `/login?next=<original-path>` so the user lands back where they
 *      were trying to go after signing in.
 *
 * The matcher deliberately excludes /market and /market/[id] — those
 * are publicly browsable; sellers want their listings findable without
 * a login wall. /u/[username] is also public (subject to the per-user
 * binder-visibility flag, which is enforced server-side at the API
 * layer, not here).
 */
export function middleware(_request: NextRequest) {
  // TODO(auth): replace with real session check once auth ships.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/binder/:path*",
    "/inbox/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};
