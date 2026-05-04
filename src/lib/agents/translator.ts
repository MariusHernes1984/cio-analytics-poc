import { streamFoundryMessages } from "@/lib/foundry/messages";
import { getPromptStore } from "@/lib/prompts/PromptStore";
import { getArticleStore } from "@/lib/articles/ArticleStore";
import type {
  AgentRunResult,
  AgentStreamEvent,
  GlossaryEntry,
  TargetLanguage,
  TranslatorInput,
} from "@/lib/agents/types";

/**
 * Run the translator agent and yield streaming events.
 *
 * If `attachToArticleId` is provided, the resulting translation is attached
 * to the existing article in ArticleStore. Otherwise the translation stands
 * alone and the caller handles persistence.
 */
export async function* runTranslator(
  input: TranslatorInput,
  attachToArticleId?: string,
): AsyncGenerator<AgentStreamEvent> {
  const start = Date.now();
  const store = await getPromptStore();
  const prompt = input.promptVersion
    ? await store.getVersion("translator", input.promptVersion)
    : await store.getCurrent("translator");

  const system = prompt.draft.systemPrompt;
  const userMessage = buildTranslatorUserMessage(input);

  yield { type: "start", model: prompt.draft.model, promptVersion: prompt.version };

  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let thinkingTokens = 0;

  try {
    const stream = streamFoundryMessages({
      model: prompt.draft.model,
      maxTokens: prompt.draft.maxTokens,
      temperature: prompt.draft.temperature,
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    for await (const event of stream) {
      if (event.type === "delta") {
        const text = event.text;
        fullText += text;
        yield { type: "delta", text };
      } else {
        inputTokens = event.inputTokens;
        outputTokens = event.outputTokens;
        thinkingTokens = event.thinkingTokens ?? 0;
      }
    }
  } catch (error) {
    yield { type: "error", message: error instanceof Error ? error.message : String(error) };
    return;
  }

  const result: AgentRunResult = {
    articleId: attachToArticleId ?? `standalone-${input.targetLanguage}-${Date.now()}`,
    agent: "translator",
    promptVersion: prompt.version,
    model: prompt.draft.model,
    inputTokens,
    outputTokens,
    ...(thinkingTokens > 0 ? { thinkingTokens } : {}),
    durationMs: Date.now() - start,
    markdown: fullText,
    warnings: [],
    createdAt: new Date().toISOString(),
  };

  if (attachToArticleId) {
    const articles = await getArticleStore();
    await articles.attachTranslation(attachToArticleId, input.targetLanguage, result);
  }

  yield { type: "done", result };
}

function buildTranslatorUserMessage(input: TranslatorInput): string {
  const parts: string[] = [];
  parts.push(`<target_language>${input.targetLanguage}</target_language>`);
  parts.push(`<target_language_name>${languageName(input.targetLanguage)}</target_language_name>`);

  if (input.glossary && input.glossary.length > 0) {
    parts.push("<glossary>");
    for (const g of input.glossary) {
      parts.push(formatGlossaryEntry(g));
    }
    parts.push("</glossary>");
  }

  parts.push("<source_markdown>");
  parts.push(input.sourceMarkdown);
  parts.push("</source_markdown>");

  parts.push(
    `\nOversett kildeteksten over til ${languageName(input.targetLanguage)}. Output kun den oversatte markdown-teksten, ingen innledning eller etterord.`,
  );

  return parts.join("\n\n");
}

function formatGlossaryEntry(g: GlossaryEntry): string {
  const note = g.note ? ` <!-- ${g.note} -->` : "";
  return `  <term source="${escapeAttr(g.source)}" target="${escapeAttr(g.target)}" />${note}`;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function languageName(code: TargetLanguage): string {
  switch (code) {
    case "en":
      return "engelsk (British English)";
    case "sv":
      return "svensk";
    case "da":
      return "dansk";
    case "fi":
      return "finsk";
  }
}
