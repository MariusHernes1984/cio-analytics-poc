/**
 * Minimal SSE client for consuming our POST+SSE endpoints from the browser.
 *
 * EventSource in browsers only supports GET; we POST JSON. So we stream the
 * response body and parse lines ourselves.
 *
 * The server emits one event per line in `data: {...}\n\n` format — see
 * lib/streaming.ts.
 *
 * Event shapes mirror AgentStreamEvent in lib/agents/types.ts but can also
 * include test-mode events from /api/prompts/[agent]/test.
 */

export type SseEvent =
  | { type: "start"; model?: string; promptVersion?: string }
  | { type: "delta"; text: string }
  | { type: "done"; result?: unknown; inputTokens?: number; outputTokens?: number }
  | { type: "error"; message: string };

export interface SseStreamOptions {
  url: string;
  body: unknown;
  signal?: AbortSignal;
  onEvent: (event: SseEvent) => void;
}

export async function streamSse({ url, body, signal, onEvent }: SseStreamOptions): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      if (typeof err?.error === "string") message = err.error;
    } catch {
      // ignore
    }
    onEvent({ type: "error", message });
    return;
  }
  if (!res.body) {
    onEvent({ type: "error", message: "Ingen respons fra server" });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE events are separated by \n\n
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      // Each line inside an event can have data: prefix (we only emit one per event)
      const dataLine = raw.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const json = dataLine.slice(5).trim();
      if (!json) continue;
      try {
        const parsed = JSON.parse(json) as SseEvent;
        onEvent(parsed);
      } catch {
        // ignore malformed events
      }
    }
  }
}
