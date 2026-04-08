import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runTranslator } from "@/lib/agents/translator";
import { agentStreamToSSE, SSE_HEADERS } from "@/lib/streaming";
import { requireSession } from "@/lib/auth/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TranslatorInputSchema = z.object({
  sourceMarkdown: z.string().min(10).max(50_000),
  targetLanguage: z.enum(["en", "sv", "da", "fi"]),
  glossary: z
    .array(
      z.object({
        source: z.string(),
        target: z.string(),
        note: z.string().optional(),
      }),
    )
    .optional(),
  promptVersion: z.string().regex(/^v\d{4,}$/).optional(),
  attachToArticleId: z.string().uuid().optional(),
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

  const parsed = TranslatorInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { attachToArticleId, ...input } = parsed.data;
  const stream = agentStreamToSSE(runTranslator(input, attachToArticleId));
  return new Response(stream, { headers: SSE_HEADERS });
}
