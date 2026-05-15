import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { generateWriterDraft } from "@/lib/agents/writer";
import { reviewArticleQuality } from "@/lib/agents/reviewer";
import { requireSession } from "@/lib/auth/requireSession";
import { getEvaluationStore } from "@/lib/evaluations/EvaluationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RunSchema = z.object({
  caseId: z.string().min(1),
  promptVersion: z.string().regex(/^v\d{4,}$/).optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session.ok || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const caseId = req.nextUrl.searchParams.get("caseId") ?? undefined;
  const store = await getEvaluationStore();
  const runs = await store.listRuns(caseId);
  return NextResponse.json({ runs });
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

  const parsed = RunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const store = await getEvaluationStore();
  const evalCase = await store.getCase(parsed.data.caseId);
  if (!evalCase) {
    return NextResponse.json({ error: "Evaluation case not found" }, { status: 404 });
  }

  const writerResult = await generateWriterDraft({
    topic: evalCase.topic,
    brief: evalCase.brief,
    targetLengthWords: evalCase.targetLengthWords,
    researchMaterial: evalCase.researchMaterial,
    styleNotes: evalCase.styleNotes,
    promptVersion: parsed.data.promptVersion,
  });

  const reviewerBrief = [
    evalCase.brief,
    evalCase.criteria ? `<evaluation_criteria>\n${evalCase.criteria}\n</evaluation_criteria>` : "",
    evalCase.expectedNotes ? `<expected_editorial_notes>\n${evalCase.expectedNotes}\n</expected_editorial_notes>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const review = await reviewArticleQuality({
    articleId: writerResult.articleId,
    markdown: writerResult.markdown,
    brief: reviewerBrief,
    topic: evalCase.topic,
  });

  const run = {
    id: randomUUID(),
    caseId: evalCase.id,
    caseName: evalCase.name,
    writerPromptVersion: writerResult.promptVersion,
    writerModel: writerResult.model,
    reviewerModel: review.model,
    reviewerPromptVersion: review.promptVersion,
    writerResult,
    review,
    createdAt: new Date().toISOString(),
  };

  await store.saveRun(run);
  return NextResponse.json(run, { status: 201 });
}
