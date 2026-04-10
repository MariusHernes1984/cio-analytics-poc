import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runReviewer } from "@/lib/agents/reviewer";
import { agentStreamToSSE, SSE_HEADERS } from "@/lib/streaming";
import { requireSession } from "@/lib/auth/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BodySchema = z.object({
  articleId: z.string().min(1),
  markdown: z.string().min(10),
  brief: z.string().min(1),
  topic: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const stream = agentStreamToSSE(
    runReviewer({
      articleId: parsed.data.articleId,
      markdown: parsed.data.markdown,
      brief: parsed.data.brief,
      topic: parsed.data.topic,
    }),
  );
  return new Response(stream, { headers: SSE_HEADERS });
}
