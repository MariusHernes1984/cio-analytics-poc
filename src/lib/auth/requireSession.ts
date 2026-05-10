/**
 * Authorization seam. Reads user info from the session cookie.
 *
 * The middleware already verified the HMAC and set x-user / x-user-role
 * headers for performance. We read those first, then fall back to
 * re-verifying the cookie directly (defense-in-depth).
 *
 * In dev mode (no POC_PASSWORD), returns a default admin session.
 */

import { cookies, headers } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export interface Session {
  ok: boolean;
  user?: {
    username: string;
    role: "admin" | "user";
  };
}

export async function requireSession(): Promise<Session> {
  // Dev mode: no auth → default admin
  if (!process.env.POC_PASSWORD) {
    return { ok: true, user: { username: "dev", role: "admin" } };
  }

  // Fast path: read headers set by middleware
  const hdrs = await headers();
  const headerUser = hdrs.get("x-user");
  const headerRole = hdrs.get("x-user-role");
  if (headerUser && (headerRole === "admin" || headerRole === "user")) {
    return { ok: true, user: { username: headerUser, role: headerRole } };
  }

  // Fallback: verify cookie directly
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return { ok: false };

  const payload = await verifySessionToken(token);
  if (!payload) return { ok: false };

  return { ok: true, user: { username: payload.u, role: payload.r } };
}

/** Check if the current session has a given role. */
export async function hasRole(role: string): Promise<boolean> {
  const session = await requireSession();
  return session.ok && session.user?.role === role;
}
