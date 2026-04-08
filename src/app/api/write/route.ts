import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runWriter } from "@/lib/agents/writer";
import { agentStreamToSSE, SSE_HEADERS } from "@/lib/streaming";
import { requireSession } from "@/lib/auth/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min ceiling for long generations

const ResearchMaterialSchema = z.object({
  kind: z.enum(["transcript", "survey-data", "notes", "reference-article"]),
  label: z.string(),
  content: z.string(),
});

const WriterInputSchema = z.object({
  topic: z.string().min(5).max(200),
  brief: z.string().min(50).max(5000),
  targetLengthWords: z.number().int().min(300).max(2000).optional(),
  researchMaterial: z.array(ResearchMaterialSchema).optional(),
  styleNotes: z.string().max(2000).optional(),
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

  const parsed = WriterInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const stream = agentStreamToSSE(runWriter(parsed.data));
  return new Response(stream, { headers: SSE_HEADERS });
}
