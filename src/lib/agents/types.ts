/**
 * Shared types for both agents. Exported via barrel for UI/API import.
 */

export type AgentId = "writer" | "translator";

export type TargetLanguage = "en" | "sv" | "da" | "fi";

export const TARGET_LANGUAGE_LABELS: Record<TargetLanguage, string> = {
  en: "English",
  sv: "Svenska",
  da: "Dansk",
  fi: "Suomi",
};

export interface ResearchMaterial {
  kind: "transcript" | "survey-data" | "notes" | "reference-article";
  label: string;
  content: string;
}

export interface WriterInput {
  topic: string;
  brief: string;
  targetLengthWords?: number;
  researchMaterial?: ResearchMaterial[];
  styleNotes?: string;
  /** Pin to a specific prompt version for reproducibility. Defaults to current. */
  promptVersion?: string;
}

/**
 * Input for the reviser: produces a new version of an existing article
 * based on user feedback. Reuses the writer system prompt — the house
 * style, structure, and tone rules still apply — but feeds the current
 * article and feedback as the user message instead of brief + research.
 */
export interface ReviserInput {
  articleId: string;
  currentMarkdown: string;
  feedback: string;
  promptVersion?: string;
}

export interface GlossaryEntry {
  source: string;
  target: string;
  note?: string;
}

export interface TranslatorInput {
  sourceMarkdown: string;
  targetLanguage: TargetLanguage;
  glossary?: GlossaryEntry[];
  promptVersion?: string;
}

export interface AgentRunResult {
  articleId: string;
  agent: AgentId;
  promptVersion: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Tokens used for extended thinking (Opus extended only). */
  thinkingTokens?: number;
  durationMs: number;
  markdown: string;
  warnings: string[];
  createdAt: string;
}

/**
 * Streaming event types yielded by agent runners. UI consumes these to
 * render progress and final state.
 */
export type AgentStreamEvent =
  | { type: "start"; model: string; promptVersion: string }
  | { type: "delta"; text: string }
  | { type: "done"; result: AgentRunResult }
  | { type: "error"; message: string };

/* ── Quality reviewer types ──────────────────────────── */

export interface ReviewDimension {
  dimension: string;
  label: string;
  score: number; // 1–5
  feedback: string;
}

export interface ArticleReview {
  dimensions: ReviewDimension[];
  overallScore: number; // 1–5
  summary: string;
  suggestions: string[];
  model: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
  durationMs: number;
  createdAt: string;
}

export interface ReviewerInput {
  articleId: string;
  markdown: string;
  brief: string;
  topic: string;
}

export type ReviewStreamEvent =
  | { type: "start"; model: string }
  | { type: "delta"; text: string }
  | { type: "done"; result: { review: ArticleReview } }
  | { type: "error"; message: string };
