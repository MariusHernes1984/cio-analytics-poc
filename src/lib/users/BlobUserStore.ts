import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import { getEnv } from "@/lib/env";
import type { StoredUser, UserStore } from "./UserStore";

const BLOB_NAME = "users.json";

export class BlobUserStore implements UserStore {
  private readonly container: ContainerClient;

  constructor() {
    const env = getEnv();
    if (!env.AZURE_STORAGE_CONNECTION_STRING) {
      throw new Error("BlobUserStore requires AZURE_STORAGE_CONNECTION_STRING");
    }
    const service = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
    this.container = service.getContainerClient("users");
  }

  async list(): Promise<StoredUser[]> {
    try {
      const blob = this.container.getBlockBlobClient(BLOB_NAME);
      const res = await blob.download(0);
      const body = await streamToString(res.readableStreamBody!);
      return JSON.parse(body) as StoredUser[];
    } catch {
      return [];
    }
  }

  async getByUsername(username: string): Promise<StoredUser | null> {
    const users = await this.list();
    return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
  }

  async add(user: StoredUser): Promise<void> {
    const users = await this.list();
    users.push(user);
    await this.write(users);
  }

  async remove(id: string): Promise<void> {
    const users = await this.list();
    await this.write(users.filter((u) => u.id !== id));
  }

  async count(): Promise<number> {
    return (await this.list()).length;
  }

  private async write(users: StoredUser[]): Promise<void> {
    await this.container.createIfNotExists();
    const blob = this.container.getBlockBlobClient(BLOB_NAME);
    const json = JSON.stringify(users, null, 2);
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
