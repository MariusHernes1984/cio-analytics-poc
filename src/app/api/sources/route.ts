import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireSession } from "@/lib/auth/requireSession";
import { getSourceStore } from "@/lib/sources/SourceStore";

export const dynamic = "force-dynamic";

const AddSourceSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
});

const DeleteSourceSchema = z.object({
  id: z.string().min(1),
});

/** GET — list all approved reference sources */
export async function GET() {
  const session = await requireSession();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getSourceStore();
  const sources = await store.list();
  return NextResponse.json(sources);
}

/** POST — add a new reference source */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AddSourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const store = await getSourceStore();
  await store.add({
    id: randomUUID(),
    name: parsed.data.name,
    domain: parsed.data.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
    description: parsed.data.description,
    addedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE — remove a reference source by id */
export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = DeleteSourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const store = await getSourceStore();
  await store.remove(parsed.data.id);

  return NextResponse.json({ ok: true });
}
