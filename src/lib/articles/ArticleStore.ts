import type { AgentRunResult, ArticleReview, TargetLanguage } from "@/lib/agents/types";

/**
 * Storage abstraction for generated articles and their translations.
 * Same pattern as PromptStore: interface + two impls + factory.
 */

/**
 * A previous version of the article that was replaced by a revision.
 * The `feedback` is the text the user gave to produce the NEXT version.
 */
export interface ArticleRevision {
  result: AgentRunResult;
  feedback: string;
  replacedAt: string;
}

export interface StoredArticle {
  id: string;
  title: string; // extracted from first H1 of markdown, or topic fallback
  source: AgentRunResult; // the LATEST writer result (may be a revision)
  /** Prior versions, oldest first. Empty on freshly-generated articles. */
  revisions?: ArticleRevision[];
  translations: Partial<Record<TargetLanguage, AgentRunResult>>;
  review?: ArticleReview;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  languages: TargetLanguage[];
  promptVersion: string;
  model: string;
}

export interface ArticleStore {
  save(article: StoredArticle): Promise<void>;
  get(id: string): Promise<StoredArticle | null>;
  list(): Promise<ArticleListItem[]>;
  attachTranslation(id: string, language: TargetLanguage, result: AgentRunResult): Promise<void>;
  /**
   * Replace the article's source with a new result produced from user feedback.
   * Previous source is pushed into `revisions`. Translations are preserved —
   * caller/UI is responsible for prompting the user to re-translate if needed.
   */
  revise(id: string, newResult: AgentRunResult, feedback: string): Promise<void>;
  attachReview(id: string, review: ArticleReview): Promise<void>;
}

let cached: ArticleStore | null = null;

export async function getArticleStore(): Promise<ArticleStore> {
  if (cached) return cached;
  const { getEnv } = await import("@/lib/env");
  const env = getEnv();
  if (env.STORAGE_MODE === "azure") {
    const { BlobArticleStore } = await import("@/lib/articles/BlobArticleStore");
    cached = new BlobArticleStore();
  } else {
    const { LocalArticleStore } = await import("@/lib/articles/LocalArticleStore");
    cached = new LocalArticleStore();
  }
  return cached;
}

/** Extract the first H1 from markdown as a title, or fall back. */
export function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}
