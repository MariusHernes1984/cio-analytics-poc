import { NextResponse, type NextRequest } from "next/server";

/**
 * PoC auth gate: query-param login + cookie.
 *
 * - If POC_PASSWORD env var is NOT set → no auth (dev mode).
 * - Otherwise: first visit must include `?pw=<password>`. On match, middleware
 *   sets an HttpOnly/Secure cookie and redirects to the same URL without the
 *   pw param. Subsequent visits just check the cookie.
 *
 * Why not HTTP Basic Auth: Chrome under some enterprise group policies (Atea's
 * included) suppresses the native Basic Auth prompt entirely, so users see a
 * blank "Unauthorized" page with no way to log in. Query param + cookie
 * sidesteps the browser's auth UI completely.
 *
 * No sessions, no server-side state, no login page: the cookie value is just
 * the password base64-encoded, and every request compares it in constant time.
 * Roll to Entra ID later by replacing this file and
 * src/lib/auth/requireSession.ts.
 */
const PUBLIC_PATHS = ["/api/health"];
const COOKIE_NAME = "poc_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function middleware(req: NextRequest) {
  const password = process.env.POC_PASSWORD;

  // Dev/local: no password configured → allow everything
  if (!password) return NextResponse.next();

  // Public endpoints (e.g. health) skip auth
  const path = req.nextUrl.pathname;
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // First-visit login via ?pw=<password>: set cookie, strip param, redirect
  const pwParam = req.nextUrl.searchParams.get("pw");
  if (pwParam !== null) {
    if (!constantTimeEqual(pwParam, password)) {
      return new NextResponse("Ugyldig passord", { status: 401 });
    }
    const cleanUrl = req.nextUrl.clone();
    cleanUrl.searchParams.delete("pw");
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(COOKIE_NAME, encodeCookie(password), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  }

  // Subsequent visits: check cookie
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && constantTimeEqual(decodeCookie(cookie), password)) {
    return NextResponse.next();
  }

  // No valid cookie → prompt user to append ?pw=
  return new NextResponse(
    "Ikke innlogget. Legg til ?pw=<passord> i URL-en for å logge inn.",
    { status: 401, headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}

// btoa/atob are available in the Edge Runtime where middleware runs.
// They're ASCII-only, which is fine for the password charset we use.
function encodeCookie(value: string): string {
  return btoa(value);
}

function decodeCookie(value: string): string {
  try {
    return atob(value);
  } catch {
    return "";
  }
}

/** Constant-time string comparison to avoid timing attacks. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const config = {
  // Run on everything except Next.js internals and static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
