import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import { getEnv } from "@/lib/env";
import type { AgentId } from "@/lib/agents/types";
import { DEFAULT_PROMPTS, type PromptDraft } from "@/lib/prompts/defaults";
import {
  formatVersion,
  parseVersion,
  type PromptStore,
  type PromptVersion,
  type PromptVersionMeta,
  type SaveOptions,
} from "@/lib/prompts/PromptStore";

/**
 * Production prompt store backed by Azure Blob Storage.
 *
 * Layout:
 *   <container>/writer/v0001.json
 *   <container>/writer/v0002.json
 *   <container>/writer/current.txt    (contains e.g. "v0002")
 *   <container>/translator/v0001.json
 *   <container>/translator/current.txt
 *
 * Versions are immutable. Editing = new version. `current.txt` is the only
 * mutable pointer.
 *
 * TODO (migration to managed identity): replace
 * BlobServiceClient.fromConnectionString with
 * `new BlobServiceClient(\`https://\${account}.blob.core.windows.net\`, new DefaultAzureCredential())`.
 */
export class BlobPromptStore implements PromptStore {
  private readonly container: ContainerClient;
  private readonly seededAgents = new Set<AgentId>();

  constructor() {
    const env = getEnv();
    if (!env.AZURE_STORAGE_CONNECTION_STRING) {
      throw new Error("BlobPromptStore requires AZURE_STORAGE_CONNECTION_STRING (managed identity path not yet wired)");
    }
    const service = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
    this.container = service.getContainerClient(env.AZURE_STORAGE_CONTAINER_PROMPTS);
  }

  private blobPath(agent: AgentId, version: string): string {
    return `${agent}/${version}.json`;
  }

  private currentPath(agent: AgentId): string {
    return `${agent}/current.txt`;
  }

  private async ensureContainer(): Promise<void> {
    await this.container.createIfNotExists();
  }

  private async ensureSeeded(agent: AgentId): Promise<void> {
    if (this.seededAgents.has(agent)) return;
    await this.ensureContainer();
    const currentBlob = this.container.getBlobClient(this.currentPath(agent));
    if (await currentBlob.exists()) {
      this.seededAgents.add(agent);
      return;
    }
    const draft = DEFAULT_PROMPTS[agent];
    await this.saveNewVersion(agent, draft, {
      author: "system",
      changeNote: "Initial default prompt (auto-seeded)",
    });
    this.seededAgents.add(agent);
  }

  async getCurrent(agent: AgentId): Promise<PromptVersion> {
    await this.ensureSeeded(agent);
    const currentBlob = this.container.getBlobClient(this.currentPath(agent));
    const download = await currentBlob.download();
    const current = (await streamToString(download.readableStreamBody)).trim();
    return this.getVersion(agent, current);
  }

  async getVersion(agent: AgentId, version: string): Promise<PromptVersion> {
    const blob = this.container.getBlobClient(this.blobPath(agent, version));
    const download = await blob.download();
    const raw = await streamToString(download.readableStreamBody);
    return JSON.parse(raw) as PromptVersion;
  }

  async listVersions(agent: AgentId): Promise<PromptVersionMeta[]> {
    await this.ensureSeeded(agent);
    const versions: PromptVersionMeta[] = [];
    for await (const blob of this.container.listBlobsFlat({ prefix: `${agent}/` })) {
      if (!blob.name.endsWith(".json")) continue;
      const blobClient = this.container.getBlobClient(blob.name);
      const download = await blobClient.download();
      const raw = await streamToString(download.readableStreamBody);
      const parsed = JSON.parse(raw) as PromptVersion;
      versions.push({
        agent: parsed.agent,
        version: parsed.version,
        createdAt: parsed.createdAt,
        author: parsed.author,
        changeNote: parsed.changeNote,
      });
    }
    versions.sort((a, b) => (a.version < b.version ? 1 : -1));
    return versions;
  }

  async saveNewVersion(agent: AgentId, draft: PromptDraft, options: SaveOptions): Promise<PromptVersion> {
    await this.ensureContainer();
    const existing = await this.safeListVersionNumbers(agent);
    const nextNumber = existing.length === 0 ? 1 : Math.max(...existing) + 1;
    const version = formatVersion(nextNumber);
    const record: PromptVersion = {
      agent,
      version,
      draft,
      createdAt: new Date().toISOString(),
      author: options.author,
      changeNote: options.changeNote,
    };
    const payload = JSON.stringify(record, null, 2);
    await this.container
      .getBlockBlobClient(this.blobPath(agent, version))
      .upload(payload, Buffer.byteLength(payload, "utf8"), {
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
    await this.container
      .getBlockBlobClient(this.currentPath(agent))
      .upload(version, Buffer.byteLength(version, "utf8"), {
        blobHTTPHeaders: { blobContentType: "text/plain" },
      });
    return record;
  }

  async setCurrent(agent: AgentId, version: string): Promise<void> {
    await this.getVersion(agent, version); // verify exists
    await this.container
      .getBlockBlobClient(this.currentPath(agent))
      .upload(version, Buffer.byteLength(version, "utf8"), {
        blobHTTPHeaders: { blobContentType: "text/plain" },
      });
  }

  private async safeListVersionNumbers(agent: AgentId): Promise<number[]> {
    const numbers: number[] = [];
    try {
      for await (const blob of this.container.listBlobsFlat({ prefix: `${agent}/` })) {
        if (!blob.name.endsWith(".json")) continue;
        const version = blob.name.replace(`${agent}/`, "").replace(/\.json$/, "");
        const n = parseVersion(version);
        if (!Number.isNaN(n)) numbers.push(n);
      }
    } catch {
      // container missing → return empty
    }
    return numbers;
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
