import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireSession } from "@/lib/auth/requireSession";
import { getUserStore, toUserInfo } from "@/lib/users/UserStore";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

const CreateUserSchema = z.object({
  username: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dots, dashes, and underscores"),
  password: z.string().min(4).max(200),
  role: z.enum(["admin", "user"]),
});

const DeleteUserSchema = z.object({
  id: z.string().min(1),
});

/** GET — list all users (admin only, no password hashes) */
export async function GET() {
  const session = await requireSession();
  if (!session.ok || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await getUserStore();
  const users = await store.list();
  return NextResponse.json(users.map(toUserInfo));
}

/** POST — create a new user (admin only) */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session.ok || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const store = await getUserStore();

  // Check for duplicate username
  const existing = await store.getByUsername(parsed.data.username);
  if (existing) {
    return NextResponse.json({ error: "Brukernavnet er allerede i bruk" }, { status: 409 });
  }

  await store.add({
    id: randomUUID(),
    username: parsed.data.username,
    role: parsed.data.role,
    passwordHash: hashPassword(parsed.data.password),
    createdAt: new Date().toISOString(),
    createdBy: session.user?.username ?? "unknown",
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE — remove a user (admin only, cannot delete yourself) */
export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!session.ok || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = DeleteUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const store = await getUserStore();
  const users = await store.list();
  const target = users.find((u) => u.id === parsed.data.id);

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Cannot delete yourself
  if (target.username.toLowerCase() === session.user?.username?.toLowerCase()) {
    return NextResponse.json({ error: "Du kan ikke slette din egen konto" }, { status: 400 });
  }

  await store.remove(parsed.data.id);
  return NextResponse.json({ ok: true });
}
