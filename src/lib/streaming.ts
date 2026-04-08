import type { AgentStreamEvent } from "@/lib/agents/types";

/**
 * Shared helper for converting an agent's AsyncGenerator into a
 * Server-Sent Events (SSE) stream that the browser can consume via
 * EventSource or fetch + ReadableStream.
 *
 * Each event is sent as:
 *   data: {JSON}\n\n
 *
 * The client reconstructs events from these lines.
 */
export function agentStreamToSSE(
  generator: AsyncGenerator<AgentStreamEvent>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of generator) {
          const line = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(line));
        }
      } catch (error) {
        const errorEvent: AgentStreamEvent = {
          type: "error",
          message: error instanceof Error ? error.message : String(error),
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-store, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;
