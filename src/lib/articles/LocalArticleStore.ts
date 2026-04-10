import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentRunResult, ArticleReview, TargetLanguage } from "@/lib/agents/types";
import {
  extractTitle,
  type ArticleListItem,
  type ArticleStore,
  type StoredArticle,
} from "@/lib/articles/ArticleStore";

export class LocalArticleStore implements ArticleStore {
  private readonly rootDir: string;

  constructor(rootDir = path.join(process.cwd(), ".local-articles")) {
    this.rootDir = rootDir;
  }

  private filePath(id: string): string {
    return path.join(this.rootDir, `${id}.json`);
  }

  async save(article: StoredArticle): Promise<void> {
    await fs.mkdir(this.rootDir, { recursive: true });
    await fs.writeFile(this.filePath(article.id), JSON.stringify(article, null, 2), "utf8");
  }

  async get(id: string): Promise<StoredArticle | null> {
    try {
      const raw = await fs.readFile(this.filePath(id), "utf8");
      return JSON.parse(raw) as StoredArticle;
    } catch {
      return null;
    }
  }

  async list(): Promise<ArticleListItem[]> {
    try {
      await fs.mkdir(this.rootDir, { recursive: true });
      const entries = await fs.readdir(this.rootDir);
      const items: ArticleListItem[] = [];
      for (const entry of entries) {
        if (!entry.endsWith(".json")) continue;
        const raw = await fs.readFile(path.join(this.rootDir, entry), "utf8");
        const article = JSON.parse(raw) as StoredArticle;
        items.push({
          id: article.id,
          title: article.title,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          languages: Object.keys(article.translations) as TargetLanguage[],
          promptVersion: article.source.promptVersion,
          model: article.source.model,
        });
      }
      items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      return items;
    } catch {
      return [];
    }
  }

  async attachTranslation(id: string, language: TargetLanguage, result: AgentRunResult): Promise<void> {
    const article = await this.get(id);
    if (!article) throw new Error(`Article ${id} not found`);
    article.translations[language] = result;
    article.updatedAt = new Date().toISOString();
    await this.save(article);
  }

  async revise(id: string, newResult: AgentRunResult, feedback: string): Promise<void> {
    const article = await this.get(id);
    if (!article) throw new Error(`Article ${id} not found`);
    const now = new Date().toISOString();
    const revisions = article.revisions ?? [];
    revisions.push({ result: article.source, feedback, replacedAt: now });
    article.revisions = revisions;
    article.source = newResult;
    article.title = extractTitle(newResult.markdown, article.title);
    article.updatedAt = now;
    await this.save(article);
  }

  async attachReview(id: string, review: ArticleReview): Promise<void> {
    const article = await this.get(id);
    if (!article) throw new Error(`Article ${id} not found`);
    article.review = review;
    article.updatedAt = new Date().toISOString();
    await this.save(article);
  }
}

// Re-export helper for convenience
export { extractTitle };
