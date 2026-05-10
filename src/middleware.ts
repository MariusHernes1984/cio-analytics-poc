import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";

/**
 * Auth middleware — cookie-based sessions with HMAC verification.
 *
 * - If POC_PASSWORD is NOT set → dev mode, no auth.
 * - Otherwise: check for a valid signed session cookie.
 * - Unauthenticated users are redirected to /login.
 * - Login page and auth API routes are public.
 *
 * The cookie is set by /api/auth/login after verifying credentials.
 * Format: base64(payload).hmac — see src/lib/auth/session.ts.
 */
const PUBLIC_PATHS = ["/api/health", "/api/auth", "/login"];

export async function middleware(req: NextRequest) {
  const password = process.env.POC_PASSWORD;

  // Dev/local: no password configured → allow everything
  if (!password) return NextResponse.next();

  const path = req.nextUrl.pathname;

  // Public endpoints skip auth
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // ── Backward compat: redirect old ?pw= logins to /login ──────────
  const pwParam = req.nextUrl.searchParams.get("pw");
  if (pwParam !== null) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.delete("pw");
    return NextResponse.redirect(loginUrl);
  }

  // ── Check session cookie ──────────────────────────────────────────
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    return redirectToLogin(req);
  }

  const payload = await verifySessionToken(cookie);
  if (!payload) {
    return redirectToLogin(req);
  }

  // Valid session — pass user info in headers for server components
  const res = NextResponse.next();
  res.headers.set("x-user", payload.u);
  res.headers.set("x-user-role", payload.r);
  return res;
}

function redirectToLogin(req: NextRequest): NextResponse {
  // API requests get 401, page requests get redirect
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
