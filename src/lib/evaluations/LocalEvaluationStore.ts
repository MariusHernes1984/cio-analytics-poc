import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  EvaluationCase,
  EvaluationRun,
  EvaluationStore,
  HumanVerdict,
} from "@/lib/evaluations/EvaluationStore";

export class LocalEvaluationStore implements EvaluationStore {
  private readonly rootDir: string;

  constructor(rootDir = path.join(process.cwd(), ".local-evaluations")) {
    this.rootDir = rootDir;
  }

  private casesPath(): string {
    return path.join(this.rootDir, "cases.json");
  }

  private runsPath(): string {
    return path.join(this.rootDir, "runs.json");
  }

  async listCases(): Promise<EvaluationCase[]> {
    const cases = await this.readArray<EvaluationCase>(this.casesPath());
    return cases.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async getCase(id: string): Promise<EvaluationCase | null> {
    const cases = await this.listCases();
    return cases.find((item) => item.id === id) ?? null;
  }

  async saveCase(evalCase: EvaluationCase): Promise<void> {
    const cases = await this.readArray<EvaluationCase>(this.casesPath());
    const next = [evalCase, ...cases.filter((item) => item.id !== evalCase.id)];
    await this.writeArray(this.casesPath(), next);
  }

  async listRuns(caseId?: string): Promise<EvaluationRun[]> {
    const runs = await this.readArray<EvaluationRun>(this.runsPath());
    const filtered = caseId ? runs.filter((run) => run.caseId === caseId) : runs;
    return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async getRun(id: string): Promise<EvaluationRun | null> {
    const runs = await this.listRuns();
    return runs.find((run) => run.id === id) ?? null;
  }

  async saveRun(run: EvaluationRun): Promise<void> {
    const runs = await this.readArray<EvaluationRun>(this.runsPath());
    const next = [run, ...runs.filter((item) => item.id !== run.id)];
    await this.writeArray(this.runsPath(), next);
  }

  async updateVerdict(id: string, verdict: HumanVerdict): Promise<EvaluationRun> {
    const runs = await this.readArray<EvaluationRun>(this.runsPath());
    const existing = runs.find((run) => run.id === id);
    if (!existing) throw new Error(`Evaluation run ${id} not found`);
    const updated = { ...existing, humanVerdict: verdict };
    await this.writeArray(
      this.runsPath(),
      runs.map((run) => (run.id === id ? updated : run)),
    );
    return updated;
  }

  private async readArray<T>(filePath: string): Promise<T[]> {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      return JSON.parse(raw) as T[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async writeArray<T>(filePath: string, items: T[]): Promise<void> {
    await fs.mkdir(this.rootDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf8");
  }
}
