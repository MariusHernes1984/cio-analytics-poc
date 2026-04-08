/**
 * Authorization seam. The single place where "is this request allowed?" is
 * decided. In PoC: always yes (the HTTP Basic Auth middleware is the only
 * gate). In production: replaced with next-auth session lookup + role check
 * against Entra ID group claims.
 *
 * Keeping this as a function (even though it's trivial today) means the
 * migration is a single-file edit — nothing else in the app imports auth
 * logic directly.
 */

export interface Session {
  ok: boolean;
  user?: {
    id: string;
    name: string;
    roles: string[];
  };
}

export async function requireSession(): Promise<Session> {
  // PoC: the Basic Auth middleware already gated the request.
  // If this function is called, the request is authorized.
  return { ok: true };
}

/** Check if the current session has a given role. PoC = always true. */
export async function hasRole(_role: string): Promise<boolean> {
  return true;
}
