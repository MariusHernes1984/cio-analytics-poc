import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getUserStore } from "@/lib/users/UserStore";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { username, password } = parsed.data;
    const pocPassword = process.env.POC_PASSWORD;
    const store = await getUserStore();

    // Bootstrap: if no users exist, create admin from POC_PASSWORD
    const userCount = await store.count();
    if (userCount === 0 && pocPassword) {
      await store.add({
        id: randomUUID(),
        username: "admin",
        role: "admin",
        passwordHash: hashPassword(pocPassword),
        createdAt: new Date().toISOString(),
        createdBy: "system",
      });
    }

    // Look up user
    let user = await store.getByUsername(username);

    // Admin master-key: POC_PASSWORD always works for admin account.
    // This is the PoC safety net — if the hash got corrupted during
    // bootstrap, the admin can still log in and recreate users.
    let authenticated = false;

    if (user) {
      // Try normal password verification first
      authenticated = verifyPassword(password, user.passwordHash);

      // Fallback: admin + POC_PASSWORD → re-hash and allow
      if (!authenticated && user.username === "admin" && pocPassword && password === pocPassword) {
        authenticated = true;
        // Fix the stored hash so normal login works next time
        await store.remove(user.id);
        const fixed = {
          ...user,
          id: randomUUID(),
          passwordHash: hashPassword(pocPassword),
        };
        await store.add(fixed);
        user = fixed;
      }
    } else if (username === "admin" && pocPassword && password === pocPassword) {
      // Admin doesn't exist but POC_PASSWORD matches — create on the fly
      const newAdmin = {
        id: randomUUID(),
        username: "admin" as const,
        role: "admin" as const,
        passwordHash: hashPassword(pocPassword),
        createdAt: new Date().toISOString(),
        createdBy: "system",
      };
      await store.add(newAdmin);
      user = newAdmin;
      authenticated = true;
    }

    if (!user || !authenticated) {
      return NextResponse.json({ error: "Feil brukernavn eller passord" }, { status: 401 });
    }

    // Create session token and set cookie
    const token = await createSessionToken({ u: user.username, r: user.role });
    const isHttps = req.headers.get("x-forwarded-proto") === "https" ||
                    req.nextUrl.protocol === "https:";
    const res = NextResponse.json({ ok: true, username: user.username, role: user.role });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: `Innlogging feilet: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
