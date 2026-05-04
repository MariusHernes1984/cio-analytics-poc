import { randomUUID } from "node:crypto";
import { streamFoundryMessages } from "@/lib/foundry/messages";
import { getPromptStore } from "@/lib/prompts/PromptStore";
import { getArticleStore } from "@/lib/articles/ArticleStore";
import type {
  AgentRunResult,
  AgentStreamEvent,
  ReviserInput,
} from "@/lib/agents/types";

/**
 * Run the reviser and yield streaming events.
 *
 * The reviser reuses the WRITER system prompt verbatim — house style,
 * structure rules, and output contract all still apply. What changes is
 * the user message: instead of topic + brief + research we feed the
 * existing article plus the editor's feedback, and tell Claude to
 * produce a new full version incorporating the feedback.
 *
 * On completion it calls `ArticleStore.revise()`, which pushes the old
 * source into the article's revisions array and sets the new result as
 * the active source.
 */
export async function* runReviser(input: ReviserInput): AsyncGenerator<AgentStreamEvent> {
  const start = Date.now();
  const store = await getPromptStore();
  const prompt = input.promptVersion
    ? await store.getVersion("writer", input.promptVersion)
    : await store.getCurrent("writer");

  const system = prompt.draft.systemPrompt;
  const userMessage = buildReviserUserMessage(input);

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

  const warnings = extractWarnings(fullText);
  const result: AgentRunResult = {
    // New result ID — not the article ID. Kept for traceability across revisions.
    articleId: randomUUID(),
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

  // Persist: pushes current source into revisions, sets this as new source.
  const articles = await getArticleStore();
  await articles.revise(input.articleId, result, input.feedback);

  yield { type: "done", result };
}

function buildReviserUserMessage(input: ReviserInput): string {
  return [
    "Du får en eksisterende CIO Analytics-artikkel og tilbakemelding fra redaktøren.",
    "Lag en ny, fullstendig versjon av artikkelen som adresserer tilbakemeldingen.",
    "Behold alt som ikke er berørt av tilbakemeldingen — tone, struktur, fakta, sitater.",
    "Ikke oppsummer endringene. Output kun den nye artikkelen som markdown.",
    "",
    "<current_article>",
    input.currentMarkdown,
    "</current_article>",
    "",
    "<revision_feedback>",
    input.feedback,
    "</revision_feedback>",
    "",
    "Skriv den reviderte artikkelen nå.",
  ].join("\n");
}

/** Scan output for [KILDE MANGLER] markers — same as writer. */
function extractWarnings(markdown: string): string[] {
  const warnings: string[] = [];
  const matches = markdown.matchAll(/\[KILDE MANGLER[^\]]*\]/g);
  for (const m of matches) {
    warnings.push(m[0]);
  }
  return warnings;
}
