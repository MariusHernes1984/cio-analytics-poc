import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getFoundryClient } from "@/lib/foundry/client";
import { requireSession } from "@/lib/auth/requireSession";
import { SSE_HEADERS } from "@/lib/streaming";
import { parseThinkingConfig, getThinkingParams } from "@/lib/agents/thinking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Dry-run endpoint for the prompt editor. Takes a *draft* system prompt and
 * a sample user message and streams the model response. Does NOT persist
 * anything — no prompt version saved, no article saved. Used exclusively by
 * the test pane in /prompts/[agent].
 */
const TestBodySchema = z.object({
  systemPrompt: z.string().min(10).max(50_000),
  userMessage: z.string().min(1).max(50_000),
  model: z.string().min(1),
  maxTokens: z.number().int().min(64).max(16_000).default(2000),
  temperature: z.number().min(0).max(2).default(0.7),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agent: string }> },
) {
  const session = await requireSession();
  if (!session.ok || session.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // We accept the agent param for symmetry but don't use it here — a test
  // run is agent-agnostic (just raw system+user+model).
  void (await params);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = TestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const client = getFoundryClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "start", model: parsed.data.model })}\n\n`),
        );
        const thinking = parseThinkingConfig(parsed.data.model);
        const messageStream = await client.messages.stream({
          model: thinking.apiModel,
          ...(thinking.isExtended
            ? getThinkingParams(thinking, parsed.data.maxTokens)
            : { max_tokens: parsed.data.maxTokens, temperature: parsed.data.temperature }),
          system: parsed.data.systemPrompt,
          messages: [{ role: "user", content: parsed.data.userMessage }],
        } as Parameters<typeof client.messages.stream>[0]);
        for await (const event of messageStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const text = event.delta.text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "delta", text })}\n\n`),
            );
          }
        }
        const final = await messageStream.finalMessage();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              inputTokens: final.usage.input_tokens,
              outputTokens: final.usage.output_tokens,
            })}\n\n`,
          ),
        );
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: error instanceof Error ? error.message : String(error),
            })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
