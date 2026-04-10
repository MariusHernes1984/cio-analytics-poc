import { getFoundryClient } from "@/lib/foundry/client";
import { getArticleStore } from "@/lib/articles/ArticleStore";
import type {
  ArticleReview,
  ReviewerInput,
  ReviewStreamEvent,
} from "@/lib/agents/types";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 2000;
const TEMPERATURE = 0.2;

const SYSTEM_PROMPT = `Du er en kvalitetsvurderer for CIO Analytics-artikler — en norskspråklig artikkelrekke rettet mot IT-ledere i Norden.

Du mottar en ferdig artikkel, dens tema og briefen som ble brukt til å generere den. Vurder artikkelen mot 6 dimensjoner. Hver dimensjon scores 1–5:

1 = Svak — oppfyller ikke kriteriet
2 = Under middels — viktige mangler
3 = Akseptabel — fungerer, men rom for forbedring
4 = God — oppfyller kriteriet godt
5 = Utmerket — overgår forventningene

Dimensjoner:
- brief_alignment: Adresserer artikkelen temaet og vinkelen fra briefen?
- structure: Har den H1, ingress, 4–6 seksjoner, og en tydelig takeaway?
- tone: Korrekt executive-register — konkret, ikke buzzword-drevet, ingen utropstegn, ingen «I en verden der…»-klisjeer?
- factual_rigor: Er påstander underbygget av kildematerialet? Brukes [KILDE MANGLER] der det trengs?
- readability: God flyt, variasjon i setningslengde, innenfor målord-lengde?
- cio_relevance: Ville en nordisk CIO finne dette nyttig og handlingsorientert?

Output kun et JSON-objekt — ingen markdown-blokker, ingen innledning. Formatet:
{
  "dimensions": [
    { "dimension": "brief_alignment", "label": "Brief Alignment", "score": 4, "feedback": "..." },
    { "dimension": "structure", "label": "Structure", "score": 3, "feedback": "..." },
    { "dimension": "tone", "label": "Tone", "score": 5, "feedback": "..." },
    { "dimension": "factual_rigor", "label": "Factual Rigor", "score": 3, "feedback": "..." },
    { "dimension": "readability", "label": "Readability", "score": 4, "feedback": "..." },
    { "dimension": "cio_relevance", "label": "CIO Relevance", "score": 4, "feedback": "..." }
  ],
  "overallScore": 4,
  "summary": "3–5 setninger som oppsummerer kvaliteten og de viktigste styrkene/svakhetene.",
  "suggestions": [
    "Konkret, handlingsorientert forbedringsforslag #1",
    "Konkret, handlingsorientert forbedringsforslag #2"
  ]
}

Skriv feedback og summary på norsk. Skriv suggestions på norsk. Labels for dimensjonene skal være på engelsk (som vist ovenfor).`;

/**
 * Run the quality reviewer and yield streaming events.
 *
 * The reviewer is a non-versioned agent with a hardcoded prompt.
 * It evaluates the article against 6 quality dimensions and returns
 * structured JSON scores + feedback. On completion, the review is
 * persisted on the article via ArticleStore.attachReview().
 */
export async function* runReviewer(
  input: ReviewerInput,
): AsyncGenerator<ReviewStreamEvent> {
  const start = Date.now();
  const client = getFoundryClient();

  yield { type: "start", model: MODEL };

  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const text = event.delta.text;
        fullText += text;
        yield { type: "delta", text };
      }
    }

    const final = await stream.finalMessage();
    inputTokens = final.usage.input_tokens;
    outputTokens = final.usage.output_tokens;
  } catch (error) {
    yield { type: "error", message: error instanceof Error ? error.message : String(error) };
    return;
  }

  // Parse the JSON output — strip markdown fences if Claude wraps them
  let parsed: { dimensions: ArticleReview["dimensions"]; overallScore: number; summary: string; suggestions: string[] };
  try {
    const cleaned = fullText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    yield { type: "error", message: "Failed to parse reviewer JSON output" };
    return;
  }

  const review: ArticleReview = {
    dimensions: parsed.dimensions,
    overallScore: parsed.overallScore,
    summary: parsed.summary,
    suggestions: parsed.suggestions,
    model: MODEL,
    inputTokens,
    outputTokens,
    durationMs: Date.now() - start,
    createdAt: new Date().toISOString(),
  };

  // Persist review on the article
  const articles = await getArticleStore();
  await articles.attachReview(input.articleId, review);

  yield { type: "done", result: { review } };
}

function buildUserMessage(input: ReviewerInput): string {
  return [
    `<topic>${input.topic}</topic>`,
    "",
    `<brief>\n${input.brief}\n</brief>`,
    "",
    "<article>",
    input.markdown,
    "</article>",
    "",
    "Vurder artikkelen nå. Output kun JSON.",
  ].join("\n");
}
