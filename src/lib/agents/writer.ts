import { randomUUID } from "node:crypto";
import { getFoundryClient } from "@/lib/foundry/client";
import { getPromptStore } from "@/lib/prompts/PromptStore";
import { getArticleStore, extractTitle, type StoredArticle } from "@/lib/articles/ArticleStore";
import type {
  AgentRunResult,
  AgentStreamEvent,
  ResearchMaterial,
  WriterInput,
} from "@/lib/agents/types";
import { parseThinkingConfig, getThinkingParams } from "@/lib/agents/thinking";

/**
 * Run the writer agent and yield streaming events.
 *
 * This is a single Messages API call with streaming. On completion it:
 *   1. saves the article to ArticleStore
 *   2. yields a 'done' event with the full result
 *
 * No tool use, no multi-turn, no Foundry Agent Service — direct API call.
 */
export async function* runWriter(input: WriterInput): AsyncGenerator<AgentStreamEvent> {
  const start = Date.now();
  const store = await getPromptStore();
  const prompt = input.promptVersion
    ? await store.getVersion("writer", input.promptVersion)
    : await store.getCurrent("writer");

  const system = prompt.draft.systemPrompt;
  const userMessage = buildWriterUserMessage(input);
  const client = getFoundryClient();
  const thinking = parseThinkingConfig(prompt.draft.model);

  yield { type: "start", model: prompt.draft.model, promptVersion: prompt.version };

  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let thinkingTokens = 0;

  try {
    const stream = await client.messages.stream({
      model: thinking.apiModel,
      max_tokens: prompt.draft.maxTokens,
      ...(thinking.isExtended
        ? getThinkingParams(thinking)
        : { temperature: prompt.draft.temperature }),
      system,
      messages: [{ role: "user", content: userMessage }],
    } as Parameters<typeof client.messages.stream>[0]);

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const text = event.delta.text;
        fullText += text;
        yield { type: "delta", text };
      }
      // Skip thinking deltas — we don't stream them to the client
    }

    const final = await stream.finalMessage();
    inputTokens = final.usage.input_tokens;
    outputTokens = final.usage.output_tokens;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinkingTokens = (final.usage as any).thinking_tokens ?? 0;
  } catch (error) {
    yield { type: "error", message: error instanceof Error ? error.message : String(error) };
    return;
  }

  const warnings = extractWarnings(fullText);
  const articleId = randomUUID();
  const result: AgentRunResult = {
    articleId,
    agent: "writer",
    promptVersion: prompt.version,
    model: prompt.draft.model,
    inputTokens,
    outputTokens,
    ...(thinkingTokens > 0 ? { thinkingTokens } : {}),
    durationMs: Date.now() - start,
    markdown: fullText,
    warnings,
    createdAt: new Date().toISOString(),
  };

  // Persist to ArticleStore
  const articles = await getArticleStore();
  const stored: StoredArticle = {
    id: articleId,
    title: extractTitle(fullText, input.topic),
    source: result,
    translations: {},
    createdAt: result.createdAt,
    updatedAt: result.createdAt,
  };
  await articles.save(stored);

  yield { type: "done", result };
}

/**
 * Compose the user message for the writer. Research material is wrapped in
 * XML-style tags that Claude handles well for document-style context.
 */
function buildWriterUserMessage(input: WriterInput): string {
  const parts: string[] = [];
  parts.push(`<topic>${input.topic}</topic>`);
  parts.push(`<brief>\n${input.brief}\n</brief>`);
  parts.push(`<target_length_words>${input.targetLengthWords ?? 750}</target_length_words>`);

  if (input.researchMaterial && input.researchMaterial.length > 0) {
    parts.push("<research_material>");
    for (const m of input.researchMaterial) {
      parts.push(formatMaterial(m));
    }
    parts.push("</research_material>");
  }

  if (input.styleNotes && input.styleNotes.trim().length > 0) {
    parts.push(`<style_notes>\n${input.styleNotes}\n</style_notes>`);
  }

  parts.push(
    "\nSkriv ferdig artikkel nå. Output kun markdown-teksten, ingen innledning eller etterord.",
  );

  return parts.join("\n\n");
}

function formatMaterial(m: ResearchMaterial): string {
  const attrs = `kind="${m.kind}" label="${escapeAttr(m.label)}"`;
  return `<material ${attrs}>\n${m.content}\n</material>`;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Scan output for [KILDE MANGLER] markers. */
function extractWarnings(markdown: string): string[] {
  const warnings: string[] = [];
  const matches = markdown.matchAll(/\[KILDE MANGLER[^\]]*\]/g);
  for (const m of matches) {
    warnings.push(m[0]);
  }
  return warnings;
}
