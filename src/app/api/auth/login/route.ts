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
  const store = await getUserStore();

  // Bootstrap: if no users exist and POC_PASSWORD is set, auto-create admin
  const userCount = await store.count();
  if (userCount === 0) {
    const pocPassword = process.env.POC_PASSWORD;
    if (!pocPassword) {
      return NextResponse.json(
        { error: "No users configured and POC_PASSWORD not set" },
        { status: 503 },
      );
    }

    // Create the first admin user with POC_PASSWORD
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
  const user = await store.getByUsername(username);
  if (!user) {
    return NextResponse.json({ error: "Feil brukernavn eller passord" }, { status: 401 });
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Feil brukernavn eller passord" }, { status: 401 });
  }

  // Create session token and set cookie
  const token = await createSessionToken({ u: user.username, r: user.role });
  const res = NextResponse.json({ ok: true, username: user.username, role: user.role });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return res;
}
