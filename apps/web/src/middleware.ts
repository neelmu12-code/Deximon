import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight browser auth gate.
 *
 * The FastAPI backend owns token validation. Middleware only checks whether
 * the httpOnly access_token cookie exists before allowing protected app pages.
 * The client AuthProvider still calls /auth/me on load, so expired/invalid
 * cookies are cleared from UI state even if this lightweight gate lets the
 * request through.
 */
export function middleware(request: NextRequest) {
  if (!request.cookies.has("access_token")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/binder/:path*",
    "/inbox/:path*",
    "/notifications/:path*",
    "/review/:path*",
    "/settings/:path*",
  ],
};
