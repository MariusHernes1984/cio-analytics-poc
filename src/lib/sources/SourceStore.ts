/**
 * Storage for approved reference sources (domains/organisations).
 * Same singleton-factory pattern as PromptStore and ArticleStore.
 */

export interface ReferenceSource {
  id: string;
  /** Display name, e.g. "Gartner" */
  name: string;
  /** Domain, e.g. "gartner.com" */
  domain: string;
  /** Optional description of what kind of references this source provides */
  description?: string;
  addedAt: string;
}

export interface SourceStore {
  list(): Promise<ReferenceSource[]>;
  add(source: ReferenceSource): Promise<void>;
  remove(id: string): Promise<void>;
}

let cached: SourceStore | null = null;

export async function getSourceStore(): Promise<SourceStore> {
  if (cached) return cached;
  const { getEnv } = await import("@/lib/env");
  const env = getEnv();
  if (env.STORAGE_MODE === "azure") {
    const { BlobSourceStore } = await import("@/lib/sources/BlobSourceStore");
    cached = new BlobSourceStore();
  } else {
    const { LocalSourceStore } = await import("@/lib/sources/LocalSourceStore");
    cached = new LocalSourceStore();
  }
  return cached;
}
