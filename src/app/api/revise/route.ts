import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runReviser } from "@/lib/agents/reviser";
import { getArticleStore } from "@/lib/articles/ArticleStore";
import { agentStreamToSSE, SSE_HEADERS } from "@/lib/streaming";
import { requireSession } from "@/lib/auth/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BodySchema = z.object({
  articleId: z.string().min(1),
  feedback: z.string().min(10).max(5000),
  promptVersion: z.string().regex(/^v\d{4,}$/).optional(),
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

  // Load the current article to get its markdown. We do this here (not in
  // the agent) so a missing article returns a clean 404 before we open the
  // stream, rather than an error event mid-stream.
  const store = await getArticleStore();
  const article = await store.get(parsed.data.articleId);
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const stream = agentStreamToSSE(
    runReviser({
      articleId: parsed.data.articleId,
      currentMarkdown: article.source.markdown,
      feedback: parsed.data.feedback,
      promptVersion: parsed.data.promptVersion,
    }),
  );
  return new Response(stream, { headers: SSE_HEADERS });
}
