import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireSession } from "@/lib/auth/requireSession";
import { getEvaluationStore } from "@/lib/evaluations/EvaluationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ResearchMaterialSchema = z.object({
  kind: z.enum(["transcript", "survey-data", "notes", "reference-article"]),
  label: z.string().min(1).max(120),
  content: z.string().min(1).max(50_000),
});

const CreateCaseSchema = z.object({
  name: z.string().min(3).max(160),
  topic: z.string().min(5).max(200),
  brief: z.string().min(50).max(5000),
  targetLengthWords: z.number().int().min(300).max(2000).optional(),
  researchMaterial: z.array(ResearchMaterialSchema).optional(),
  styleNotes: z.string().max(2000).optional(),
  criteria: z.string().max(4000).optional(),
  expectedNotes: z.string().max(4000).optional(),
});

export async function GET() {
  const session = await requireSession();
  if (!session.ok || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await getEvaluationStore();
  const cases = await store.listCases();
  return NextResponse.json({ cases });
}

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

  const parsed = CreateCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const evalCase = {
    id: randomUUID(),
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
    createdBy: session.user.username,
  };

  const store = await getEvaluationStore();
  await store.saveCase(evalCase);
  return NextResponse.json(evalCase, { status: 201 });
}
