import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { getEnv } from "@/lib/env";

let cached: BlobServiceClient | null = null;

export function getBlobServiceClient(): BlobServiceClient {
  if (cached) return cached;

  const env = getEnv();
  if (env.AZURE_STORAGE_CONNECTION_STRING?.trim()) {
    cached = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
    return cached;
  }

  if (env.AZURE_STORAGE_ACCOUNT?.trim()) {
    cached = new BlobServiceClient(
      `https://${env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
      new DefaultAzureCredential(),
    );
    return cached;
  }

  throw new Error(
    "Azure Blob Storage requires AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT.",
  );
}

export function isBlobNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode?: number }).statusCode === 404
  );
}
