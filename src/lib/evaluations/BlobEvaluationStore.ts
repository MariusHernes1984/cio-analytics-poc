import type { ContainerClient } from "@azure/storage-blob";
import {
  type EvaluationCase,
  type EvaluationRun,
  type EvaluationStore,
  type HumanVerdict,
} from "@/lib/evaluations/EvaluationStore";
import { getEnv } from "@/lib/env";
import { getBlobServiceClient, isBlobNotFound } from "@/lib/storage/blobClient";

const CASES_BLOB = "cases.json";
const RUNS_BLOB = "runs.json";

export class BlobEvaluationStore implements EvaluationStore {
  private readonly container: ContainerClient;

  constructor() {
    const env = getEnv();
    this.container = getBlobServiceClient().getContainerClient(env.AZURE_STORAGE_CONTAINER_EVALUATIONS);
  }

  async listCases(): Promise<EvaluationCase[]> {
    const cases = await this.readArray<EvaluationCase>(CASES_BLOB);
    return cases.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async getCase(id: string): Promise<EvaluationCase | null> {
    const cases = await this.listCases();
    return cases.find((item) => item.id === id) ?? null;
  }

  async saveCase(evalCase: EvaluationCase): Promise<void> {
    const cases = await this.readArray<EvaluationCase>(CASES_BLOB);
    const next = [evalCase, ...cases.filter((item) => item.id !== evalCase.id)];
    await this.writeArray(CASES_BLOB, next);
  }

  async listRuns(caseId?: string): Promise<EvaluationRun[]> {
    const runs = await this.readArray<EvaluationRun>(RUNS_BLOB);
    const filtered = caseId ? runs.filter((run) => run.caseId === caseId) : runs;
    return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async getRun(id: string): Promise<EvaluationRun | null> {
    const runs = await this.listRuns();
    return runs.find((run) => run.id === id) ?? null;
  }

  async saveRun(run: EvaluationRun): Promise<void> {
    const runs = await this.readArray<EvaluationRun>(RUNS_BLOB);
    const next = [run, ...runs.filter((item) => item.id !== run.id)];
    await this.writeArray(RUNS_BLOB, next);
  }

  async updateVerdict(id: string, verdict: HumanVerdict): Promise<EvaluationRun> {
    const runs = await this.readArray<EvaluationRun>(RUNS_BLOB);
    const existing = runs.find((run) => run.id === id);
    if (!existing) throw new Error(`Evaluation run ${id} not found`);
    const updated = { ...existing, humanVerdict: verdict };
    await this.writeArray(
      RUNS_BLOB,
      runs.map((run) => (run.id === id ? updated : run)),
    );
    return updated;
  }

  private async readArray<T>(blobName: string): Promise<T[]> {
    try {
      const blob = this.container.getBlobClient(blobName);
      const download = await blob.download();
      const raw = await streamToString(download.readableStreamBody);
      return JSON.parse(raw) as T[];
    } catch (error) {
      if (isBlobNotFound(error)) return [];
      throw error;
    }
  }

  private async writeArray<T>(blobName: string, items: T[]): Promise<void> {
    await this.container.createIfNotExists();
    const payload = JSON.stringify(items, null, 2);
    await this.container
      .getBlockBlobClient(blobName)
      .upload(payload, Buffer.byteLength(payload, "utf8"), {
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
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
