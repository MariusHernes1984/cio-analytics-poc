import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/requireSession";
import { getEvaluationStore } from "@/lib/evaluations/EvaluationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VerdictSchema = z.object({
  status: z.enum(["approved", "needs-work", "rejected"]),
  notes: z.string().max(4000).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
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

  const parsed = VerdictSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { runId } = await params;
  const store = await getEvaluationStore();
  const run = await store.updateVerdict(runId, {
    status: parsed.data.status,
    notes: parsed.data.notes,
    reviewer: session.user.username,
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json(run);
}
