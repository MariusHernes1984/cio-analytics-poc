import { NextResponse, type NextRequest } from "next/server";

/**
 * HTTP Basic Auth gate for the PoC.
 *
 * - If POC_PASSWORD env var is NOT set → no auth (dev mode).
 * - If POC_PASSWORD is set → every request must carry a Basic Auth header
 *   with ANY username and that exact password. Browsers handle this natively.
 *
 * No cookies, no sessions, no login page, no IP-allowlist. Literally one
 * env var. Roll to Entra ID later by replacing this file and
 * src/lib/auth/requireSession.ts.
 */
const PUBLIC_PATHS = ["/api/health"];

export function middleware(req: NextRequest) {
  const password = process.env.POC_PASSWORD;

  // Dev/local: no password configured → allow everything
  if (!password) return NextResponse.next();

  // Public endpoints (e.g. health) skip auth
  const path = req.nextUrl.pathname;
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const decoded = atob(authHeader.slice(6));
    const idx = decoded.indexOf(":");
    const provided = idx === -1 ? decoded : decoded.slice(idx + 1);
    if (!constantTimeEqual(provided, password)) {
      return unauthorized();
    }
  } catch {
    return unauthorized();
  }

  return NextResponse.next();
}

function unauthorized(): NextResponse {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="CIO Analytics PoC", charset="UTF-8"',
    },
  });
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
