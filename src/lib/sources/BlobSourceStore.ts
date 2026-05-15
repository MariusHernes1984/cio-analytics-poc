import type { ContainerClient } from "@azure/storage-blob";
import { getEnv } from "@/lib/env";
import type { ReferenceSource, SourceStore } from "./SourceStore";
import { getBlobServiceClient, isBlobNotFound } from "@/lib/storage/blobClient";

const BLOB_NAME = "sources.json";

/**
 * Azure Blob Storage implementation — stores all sources in a single JSON blob.
 */
export class BlobSourceStore implements SourceStore {
  private readonly container: ContainerClient;

  constructor() {
    const env = getEnv();
    this.container = getBlobServiceClient().getContainerClient(env.AZURE_STORAGE_CONTAINER_SOURCES);
  }

  async list(): Promise<ReferenceSource[]> {
    try {
      const blob = this.container.getBlockBlobClient(BLOB_NAME);
      const res = await blob.download(0);
      const body = await streamToString(res.readableStreamBody!);
      return JSON.parse(body) as ReferenceSource[];
    } catch (error) {
      if (!isBlobNotFound(error)) throw error;
      return [];
    }
  }

  async add(source: ReferenceSource): Promise<void> {
    const sources = await this.list();
    sources.push(source);
    await this.write(sources);
  }

  async remove(id: string): Promise<void> {
    const sources = await this.list();
    const filtered = sources.filter((s) => s.id !== id);
    await this.write(filtered);
  }

  private async write(sources: ReferenceSource[]): Promise<void> {
    await this.container.createIfNotExists();
    const blob = this.container.getBlockBlobClient(BLOB_NAME);
    const json = JSON.stringify(sources, null, 2);
    await blob.upload(json, json.length, {
      blobHTTPHeaders: { blobContentType: "application/json" },
    });
  }
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}
