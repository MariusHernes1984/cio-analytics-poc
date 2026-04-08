# Auth migration: shared password → Entra ID

The PoC uses a single shared HTTP Basic Auth password to gatekeep the deployed app. This document describes exactly what needs to change to migrate to Entra ID with role-based access. The architecture was designed so this is a **single-file-at-a-time** swap with no rewrites elsewhere in the code.

**Who needs to do this:** Someone with **Entra ID admin access** (for app registration) and **Owner** or **User Access Administrator** on the Azure subscription (for role assignments). The PoC developer intentionally doesn't need any of this.

---

## What's in place today

```
Browser → middleware.ts → (Basic Auth check against POC_PASSWORD) → route handlers
                              │
                              └─ requireSession() returns {ok:true} (stub)
```

- **`src/middleware.ts`** — ~60 lines. Checks `Authorization: Basic <base64>` header against `POC_PASSWORD` env var. If missing/wrong, returns 401 with `WWW-Authenticate: Basic`.
- **`src/lib/auth/requireSession.ts`** — returns `{ok: true}` unconditionally. Every server component and route handler calls this as its session-check seam.
- **`POC_PASSWORD`** — single env var in App Service Configuration. Rotating = edit + Save in the portal, no redeploy.

Both the UI pages and the API routes call `requireSession()` to decide "is this request allowed to proceed". Today it's always yes; tomorrow it's "if the user's Entra ID token is valid and has the right group".

---

## Target architecture

```
Browser → NextAuth (Entra ID) → session cookie → route handlers
                                       │
                                       └─ requireSession() resolves real session
                                           + checks group membership for RBAC
```

Two security groups in Entra ID:

- **`cio-analytics-editors`** — can edit prompts, generate articles, translate, export
- **`cio-analytics-users`** — read-only: can view articles and export, but can't touch `/prompts`

Role check happens inside `requireSession()` (or in a separate `requireRole(role)` helper).

---

## Migration steps

### 1. Create Entra ID app registration

(Requires Entra ID admin access.)

1. Portal → Entra ID → App registrations → **New registration**
2. Name: `cio-analytics-poc`
3. Supported account types: **Single tenant** (Atea's)
4. Redirect URI: **Web** → `https://<your-app>.azurewebsites.net/api/auth/callback/microsoft-entra-id`
5. After creation, note the **Application (client) ID** and **Directory (tenant) ID**
6. Certificates & secrets → **New client secret** → note the **value** (shown only once)
7. API permissions → add **Microsoft Graph → User.Read** (delegated) and **GroupMember.Read.All** (delegated) — grant admin consent
8. Token configuration → **Add groups claim** → Security groups (so NextAuth receives group IDs in the token)

### 2. Create security groups

1. Portal → Entra ID → Groups → **New group**
2. Create `cio-analytics-editors` (security, assigned members)
3. Create `cio-analytics-users` (security, assigned members)
4. Add users to each
5. Note both **Object IDs**

### 3. Install NextAuth

```bash
npm install next-auth@5
```

### 4. Create `src/auth.ts` (NextAuth config)

```ts
import NextAuth from "next-auth";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraId({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      // Forward group claims from ID token
      if (profile && "groups" in profile) {
        token.groups = (profile as { groups: string[] }).groups ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      return { ...session, groups: (token as { groups?: string[] }).groups ?? [] };
    },
  },
});
```

### 5. Create the NextAuth route handler

**`src/app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

### 6. Rewrite `src/middleware.ts`

Replace the entire file with a NextAuth-backed middleware. Any path that isn't `/api/auth/*` or the public health check requires a valid session.

```ts
import { auth } from "@/auth";

export default auth((req) => {
  // Public paths
  const publicPaths = ["/api/auth", "/api/health"];
  if (publicPaths.some((p) => req.nextUrl.pathname.startsWith(p))) return;

  // Unauthenticated → redirect to sign in
  if (!req.auth) {
    const url = new URL("/api/auth/signin", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 7. Rewrite `src/lib/auth/requireSession.ts`

This is the key seam. Replace the stub with real session resolution + RBAC.

```ts
import { auth } from "@/auth";

export type Role = "editor" | "user";

const EDITOR_GROUP_ID = process.env.AZURE_AD_EDITOR_GROUP_ID!;
const USER_GROUP_ID = process.env.AZURE_AD_USER_GROUP_ID!;

export async function requireSession(
  requiredRole: Role = "user",
): Promise<{ ok: true; userId: string; role: Role } | { ok: false }> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false };

  const groups = (session as unknown as { groups?: string[] }).groups ?? [];
  const isEditor = groups.includes(EDITOR_GROUP_ID);
  const isUser = groups.includes(USER_GROUP_ID);

  if (requiredRole === "editor" && !isEditor) return { ok: false };
  if (requiredRole === "user" && !isEditor && !isUser) return { ok: false };

  return {
    ok: true,
    userId: session.user.email,
    role: isEditor ? "editor" : "user",
  };
}
```

### 8. Tighten specific routes

The API routes that should be editor-only need to pass `"editor"` to `requireSession`. At minimum:

- `PUT /api/prompts/[agent]` — save new version
- `POST /api/prompts/[agent]` — set-current (rollback)
- `POST /api/prompts/[agent]/test` — dry-run (editor feature)
- `POST /api/write`
- `POST /api/translate`

The listing/detail/export routes stay at `"user"`.

### 9. Update environment variables

Add to App Service Configuration:

```
AZURE_AD_CLIENT_ID=<app-registration-client-id>
AZURE_AD_CLIENT_SECRET=<app-registration-secret>
AZURE_AD_TENANT_ID=<tenant-id>
AZURE_AD_EDITOR_GROUP_ID=<editors-group-object-id>
AZURE_AD_USER_GROUP_ID=<users-group-object-id>
AUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://<your-app>.azurewebsites.net
```

Remove `POC_PASSWORD` — no longer needed.

Also update `src/lib/env.ts` to require these vars when auth is enabled.

### 10. Test

1. Redeploy (`azd deploy`)
2. Visit the site → redirected to Microsoft sign-in → sign in
3. Verify you land on the dashboard
4. Sign in as a user not in either group → should get 403
5. Sign in as a user in `cio-analytics-users` → can view articles but `/prompts` is blocked
6. Sign in as a user in `cio-analytics-editors` → full access

---

## What does NOT need to change

Thanks to the seam design, all of these stay **exactly as they are** during the migration:

- Every page under `src/app/**` — they call `requireSession()` and don't care about the implementation
- Every API route — same reason
- `PromptStore` and `ArticleStore` implementations
- Agent runners (`writer.ts`, `translator.ts`)
- Foundry client (`foundry/client.ts`) and auth helper (`foundry/auth.ts`)
- The Monaco editor UI, the writer form, the translator form
- Bicep — the managed identity is already provisioned and already has the right RBAC on storage

**Total surface area of the migration:** ~4 files changed, ~2 files added. No data migration needed — prompts and articles stay in blob storage.

---

## Rollback plan

If something breaks mid-migration:

1. Revert the commit that swapped `middleware.ts` and `requireSession.ts`
2. Set `POC_PASSWORD` back in App Service Configuration (if removed)
3. Redeploy
4. You're back on Basic Auth

The blob storage layout is unchanged, so no data is lost.
