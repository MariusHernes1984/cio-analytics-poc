import type { AgentId } from "@/lib/agents/types";
import type { PromptDraft } from "@/lib/prompts/defaults";

/**
 * The single abstraction for prompt persistence. Agent runners, API routes,
 * and the prompt editor UI all go through this interface — never directly to
 * blob storage or the file system.
 *
 * This is the seam that lets us migrate from Blob → Cosmos (or anything else)
 * as a single-file swap.
 */
export interface PromptVersion {
  agent: AgentId;
  version: string; // "v0001", "v0002", ...
  draft: PromptDraft;
  createdAt: string; // ISO timestamp
  author: string;
  changeNote: string;
}

export type PromptVersionMeta = Omit<PromptVersion, "draft">;

export interface SaveOptions {
  author: string;
  changeNote: string;
}

export interface PromptStore {
  getCurrent(agent: AgentId): Promise<PromptVersion>;
  getVersion(agent: AgentId, version: string): Promise<PromptVersion>;
  listVersions(agent: AgentId): Promise<PromptVersionMeta[]>;
  saveNewVersion(agent: AgentId, draft: PromptDraft, options: SaveOptions): Promise<PromptVersion>;
  setCurrent(agent: AgentId, version: string): Promise<void>;
}

/**
 * Factory — returns the right implementation based on STORAGE_MODE env var.
 * Cached so the same instance is reused across requests.
 */
let cached: PromptStore | null = null;

export async function getPromptStore(): Promise<PromptStore> {
  if (cached) return cached;
  const { getEnv } = await import("@/lib/env");
  const env = getEnv();
  if (env.STORAGE_MODE === "azure") {
    const { BlobPromptStore } = await import("@/lib/prompts/BlobPromptStore");
    cached = new BlobPromptStore();
  } else {
    const { LocalPromptStore } = await import("@/lib/prompts/LocalPromptStore");
    cached = new LocalPromptStore();
  }
  return cached;
}

/** Format a version number as zero-padded "v0001". */
export function formatVersion(n: number): string {
  return `v${n.toString().padStart(4, "0")}`;
}

/** Parse "v0001" → 1. Returns NaN for invalid input. */
export function parseVersion(v: string): number {
  const m = v.match(/^v(\d{4,})$/);
  return m?.[1] ? parseInt(m[1], 10) : NaN;
}
