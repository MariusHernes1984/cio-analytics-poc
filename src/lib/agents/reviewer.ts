import { getFoundryClient } from "@/lib/foundry/client";
import { getArticleStore } from "@/lib/articles/ArticleStore";
import type {
  ArticleReview,
  ReviewerInput,
  ReviewStreamEvent,
} from "@/lib/agents/types";

const MODEL = "claude-opus-4-6";
const MAX_TOKENS = 3000;
const TEMPERATURE = 0.2;

const SYSTEM_PROMPT = `Du er en STRENG kvalitetsredaktør for CIO Analytics-artikler — en norskspråklig artikkelrekke rettet mot IT-ledere i Norden.

Du skal vurdere artikkelen KRITISK. Din jobb er å finne feil, ikke å rose. En gjennomsnittlig AI-generert artikkel bør ligge på 2.5–3.5. Score 5 er forbeholdt profesjonell journalistisk kvalitet uten noen feil. Score 4 betyr få og små feil.

VIKTIG — SCORE-KALIBRERING:
- 1 (Svak): Fundamentalt mislykket. Feil tema, ubrukelig struktur, eller gjennomgående språkfeil.
- 2 (Under middels): Vesentlige mangler. Bommer på briefens vinkel, rotete struktur, flere språk-/faktafeil, eller feil register.
- 3 (Akseptabel): Fungerer som utkast, men trenger redaksjonell bearbeiding. Noen formuleringer er uklare, klisjépreget, eller upresise.
- 4 (God): Publiserbar med minimale justeringer. Tydelig vinkel, godt språk, korrekte fakta. Maks 1–2 mindre anmerkninger.
- 5 (Utmerket): Publiserbar uten endringer. Overraskende bra — kreativ vinkling, presis bruk av kilder, engasjerende og nyttig for målgruppen. SJELDEN.

Vurder mot 6 dimensjoner med disse KONKRETE FEILKLASSENE:

## brief_alignment (Brief Alignment)
Trekk ned for: tema som avviker fra briefen, vinkel som mangler, brief-spesifikke krav som ignoreres, smertepunktet som ikke adresseres.
Score 2 eller lavere hvis artikkelen handler om noe annet enn briefen ba om.

## structure (Structure)
Trekk ned for: manglende H1, manglende eller svak ingress, færre enn 3 eller mer enn 7 seksjoner, manglende takeaway/oppsummering, dårlig logisk flyt mellom seksjoner, for korte eller for lange seksjoner.
Score 2 eller lavere hvis artikkelen mangler tydelig inndeling.

## tone (Tone)
Trekk ned for: buzzwords («transformasjon», «game-changer», «i en verden der…»), utropstegn, for muntlig språk, for akademisk språk, klisjeer, overdreven bruk av adjektiver, markedsføringsspråk.
Score 2 eller lavere hvis tonen er åpenbart feil for CIO-målgruppen.

## factual_rigor (Factual Rigor)
Trekk ned for: påstander uten kilde, oppdiktede tall/prosenter/statistikk, feil bruk av kildemateriale, manglende [KILDE MANGLER]-markering, selvmotsigelser.
Score 2 eller lavere hvis artikkelen inneholder påstander som fremstår som oppdiktet.
Hvis artikkelen IKKE hadde kildemateriale å jobbe med: maks score 3 på denne dimensjonen — det er umulig å ha god faktisk forankring uten kilder.

## readability (Readability)
Trekk ned for: monoton setningsrytme, veggblokker uten avsnitt, for korte hakk-setninger, dårlig norsk (feil pronomen, feil kjønn, feil preposisjoner, oppstykket flyt, anglisismer, orddeling som ikke fungerer), utenfor mål-lengde (±20%).
Score 2 eller lavere hvis norsk språkkvalitet er tydelig dårligere enn en menneskelig journalist.
SPESIFIKT sjekk: korrekt bruk av han/hun/hen, konsistente verbformer, riktig bruk av norske faguttrykk vs. engelske lånord.

## cio_relevance (CIO Relevance)
Trekk ned for: mangler konkrete handlingsanbefalinger, for generelt/overfladisk, ingen nordisk kontekst, irrelevant for IT-ledere, mangler «hva betyr dette for meg?»-perspektivet.
Score 2 eller lavere hvis en CIO ikke ville fått noe nyttig ut av artikkelen.

ANTI-INFLASJON: Hvis alle dimensjonene dine er 4 eller 5, STOPP og revurder. Er artikkelen virkelig så god? Ville du publisert den i et fysisk magasin uten redigering? Hvis ikke, senk scorene.

overallScore skal være et VEKTET gjennomsnitt der readability og factual_rigor teller dobbelt (de er viktigst). Rund av til nærmeste heltall.

Output kun et JSON-objekt — ingen markdown-blokker, ingen innledning. Formatet:
{
  "dimensions": [
    { "dimension": "brief_alignment", "label": "Brief Alignment", "score": 3, "feedback": "..." },
    { "dimension": "structure", "label": "Structure", "score": 3, "feedback": "..." },
    { "dimension": "tone", "label": "Tone", "score": 2, "feedback": "..." },
    { "dimension": "factual_rigor", "label": "Factual Rigor", "score": 2, "feedback": "..." },
    { "dimension": "readability", "label": "Readability", "score": 2, "feedback": "..." },
    { "dimension": "cio_relevance", "label": "CIO Relevance", "score": 3, "feedback": "..." }
  ],
  "overallScore": 3,
  "summary": "3–5 setninger som oppsummerer kvaliteten. Vær direkte og konkret om svakheter. Sitér konkrete eksempler fra teksten som illustrerer problemene.",
  "suggestions": [
    "Konkret, handlingsorientert forbedringsforslag #1 — med eksempel fra teksten",
    "Konkret, handlingsorientert forbedringsforslag #2 — med eksempel fra teksten"
  ]
}

Feedback skal ALLTID inneholde konkrete eksempler/sitater fra artikkelen som bevis. Ikke skriv «generelt bra» — skriv HVA som er bra og HVA som svikter, med referanse til spesifikke avsnitt.
Skriv feedback, summary og suggestions på norsk. Labels for dimensjonene skal være på engelsk (som vist ovenfor).`;

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
