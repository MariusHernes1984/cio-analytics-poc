import type { ContainerClient } from "@azure/storage-blob";
import { getEnv } from "@/lib/env";
import type { AgentRunResult, ArticleReview, TargetLanguage } from "@/lib/agents/types";
import { getBlobServiceClient, isBlobNotFound } from "@/lib/storage/blobClient";
import {
  extractTitle,
  type ArticleListItem,
  type ArticleStore,
  type StoredArticle,
} from "@/lib/articles/ArticleStore";

export class BlobArticleStore implements ArticleStore {
  private readonly container: ContainerClient;

  constructor() {
    const env = getEnv();
    this.container = getBlobServiceClient().getContainerClient(env.AZURE_STORAGE_CONTAINER_ARTICLES);
  }

  private blobPath(id: string): string {
    return `${id}.json`;
  }

  private async ensureContainer(): Promise<void> {
    await this.container.createIfNotExists();
  }

  async save(article: StoredArticle): Promise<void> {
    await this.ensureContainer();
    const payload = JSON.stringify(article, null, 2);
    await this.container
      .getBlockBlobClient(this.blobPath(article.id))
      .upload(payload, Buffer.byteLength(payload, "utf8"), {
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
  }

  async get(id: string): Promise<StoredArticle | null> {
    try {
      const blob = this.container.getBlobClient(this.blobPath(id));
      if (!(await blob.exists())) return null;
      const download = await blob.download();
      const raw = await streamToString(download.readableStreamBody);
      return JSON.parse(raw) as StoredArticle;
    } catch (error) {
      if (!isBlobNotFound(error)) throw error;
      return null;
    }
  }

  async list(): Promise<ArticleListItem[]> {
    await this.ensureContainer();
    const items: ArticleListItem[] = [];
    for await (const blob of this.container.listBlobsFlat()) {
      if (!blob.name.endsWith(".json")) continue;
      const blobClient = this.container.getBlobClient(blob.name);
      const download = await blobClient.download();
      const raw = await streamToString(download.readableStreamBody);
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

async function streamToString(stream: NodeJS.ReadableStream | undefined): Promise<string> {
  if (!stream) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf8");
}
