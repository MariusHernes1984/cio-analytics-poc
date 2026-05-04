import { getFoundryClient } from "@/lib/foundry/client";
import { getEnv } from "@/lib/env";
import { getFoundryAuth } from "@/lib/foundry/auth";
import { parseThinkingConfig, getThinkingParams } from "@/lib/agents/thinking";

export interface FoundryMessageInput {
  model: string;
  maxTokens: number;
  temperature: number;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export type FoundryMessageStreamEvent =
  | { type: "delta"; text: string }
  | { type: "usage"; inputTokens: number; outputTokens: number; thinkingTokens?: number };

export async function* streamFoundryMessages(
  input: FoundryMessageInput,
): AsyncGenerator<FoundryMessageStreamEvent> {
  if (isOpenAICompatibleModel(input.model)) {
    yield* streamOpenAICompatibleMessages(input);
    return;
  }

  yield* streamAnthropicMessages(input);
}

function isOpenAICompatibleModel(model: string): boolean {
  return /^(gpt|o\d|chatgpt)/i.test(model);
}

async function* streamAnthropicMessages(
  input: FoundryMessageInput,
): AsyncGenerator<FoundryMessageStreamEvent> {
  const client = getFoundryClient();
  const thinking = parseThinkingConfig(input.model);
  const stream = await client.messages.stream({
    model: thinking.apiModel,
    ...(thinking.isExtended
      ? getThinkingParams(thinking, input.maxTokens)
      : { max_tokens: input.maxTokens, temperature: input.temperature }),
    system: input.system,
    messages: input.messages,
  } as Parameters<typeof client.messages.stream>[0]);

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield { type: "delta", text: event.delta.text };
    }
  }

  const final = await stream.finalMessage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const thinkingTokens = (final.usage as any).thinking_tokens ?? 0;
  yield {
    type: "usage",
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
    ...(thinkingTokens > 0 ? { thinkingTokens } : {}),
  };
}

async function* streamOpenAICompatibleMessages(
  input: FoundryMessageInput,
): AsyncGenerator<FoundryMessageStreamEvent> {
  const env = getEnv();
  const auth = getFoundryAuth();
  const response = await fetch(
    `https://${env.FOUNDRY_RESOURCE}.services.ai.azure.com/openai/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth.kind === "apiKey"
          ? { "api-key": auth.apiKey, Authorization: `Bearer ${auth.apiKey}` }
          : { Authorization: `Bearer ${auth.token}` }),
      },
      body: JSON.stringify({
        model: input.model,
        messages: [
          { role: "system", content: input.system },
          ...input.messages,
        ],
        stream: true,
        stream_options: { include_usage: true },
        ...(input.model.toLowerCase().startsWith("gpt-5")
          ? { max_completion_tokens: input.maxTokens }
          : { max_tokens: input.maxTokens, temperature: input.temperature }),
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Foundry OpenAI-compatible request failed (${response.status}): ${detail || response.statusText}`);
  }
  if (!response.body) {
    throw new Error("Foundry OpenAI-compatible request returned no response body");
  }

  let inputTokens = 0;
  let outputTokens = 0;
  const decoder = new TextDecoder();
  let buffer = "";

  const reader = response.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const dataLines = part
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());
      for (const data of dataLines) {
        if (!data || data === "[DONE]") continue;
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
          error?: { message?: string };
        };
        if (parsed.error) {
          throw new Error(parsed.error.message ?? "Foundry OpenAI-compatible stream failed");
        }
        const text = parsed.choices?.[0]?.delta?.content;
        if (text) {
          yield { type: "delta", text };
        }
        if (parsed.usage) {
          inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
          outputTokens = parsed.usage.completion_tokens ?? outputTokens;
        }
      }
    }
  }

  yield { type: "usage", inputTokens, outputTokens };
}
