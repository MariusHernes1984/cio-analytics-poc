import type { AgentRunResult, TargetLanguage } from "@/lib/agents/types";

/**
 * Storage abstraction for generated articles and their translations.
 * Same pattern as PromptStore: interface + two impls + factory.
 */

export interface StoredArticle {
  id: string;
  title: string; // extracted from first H1 of markdown, or topic fallback
  source: AgentRunResult; // the original writer result
  translations: Partial<Record<TargetLanguage, AgentRunResult>>;
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
