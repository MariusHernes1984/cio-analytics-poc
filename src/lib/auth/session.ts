/**
 * Session cookie management — Edge Runtime compatible.
 *
 * Cookie format: base64(payload).hmac-sha256-hex
 * Payload: { u: username, r: role }
 * Secret: POC_PASSWORD env var
 *
 * Uses Web Crypto API (available in both Edge Runtime and Node.js).
 */

export const COOKIE_NAME = "cio_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  u: string;           // username
  r: "admin" | "user"; // role
}

function getSecret(): string {
  return process.env.POC_PASSWORD || "dev-secret-no-auth";
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const b64 = btoa(JSON.stringify(payload));
  const sig = await hmacSign(b64, getSecret());
  return `${b64}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const dot = token.indexOf(".");
  if (dot === -1) return null;

  const b64 = token.substring(0, dot);
  const sig = token.substring(dot + 1);

  // Verify HMAC
  const expected = await hmacSign(b64, getSecret());
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(atob(b64)) as SessionPayload;
    if (!payload.u || !payload.r) return null;
    return payload;
  } catch {
    return null;
  }
}
