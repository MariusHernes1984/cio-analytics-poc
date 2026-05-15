import type { AgentRunResult, ArticleReview, ResearchMaterial } from "@/lib/agents/types";

export type EvalVerdictStatus = "approved" | "needs-work" | "rejected";

export interface EvaluationCase {
  id: string;
  name: string;
  topic: string;
  brief: string;
  targetLengthWords?: number;
  researchMaterial?: ResearchMaterial[];
  styleNotes?: string;
  criteria?: string;
  expectedNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface HumanVerdict {
  status: EvalVerdictStatus;
  notes?: string;
  reviewer: string;
  updatedAt: string;
}

export interface EvaluationRun {
  id: string;
  caseId: string;
  caseName: string;
  writerPromptVersion: string;
  writerModel: string;
  reviewerModel: string;
  reviewerPromptVersion?: string;
  writerResult: AgentRunResult;
  review: ArticleReview;
  humanVerdict?: HumanVerdict;
  createdAt: string;
}

export interface EvaluationStore {
  listCases(): Promise<EvaluationCase[]>;
  getCase(id: string): Promise<EvaluationCase | null>;
  saveCase(evalCase: EvaluationCase): Promise<void>;
  listRuns(caseId?: string): Promise<EvaluationRun[]>;
  getRun(id: string): Promise<EvaluationRun | null>;
  saveRun(run: EvaluationRun): Promise<void>;
  updateVerdict(id: string, verdict: HumanVerdict): Promise<EvaluationRun>;
}

let cached: EvaluationStore | null = null;

export async function getEvaluationStore(): Promise<EvaluationStore> {
  if (cached) return cached;
  const { getEnv } = await import("@/lib/env");
  const env = getEnv();
  if (env.STORAGE_MODE === "azure") {
    const { BlobEvaluationStore } = await import("@/lib/evaluations/BlobEvaluationStore");
    cached = new BlobEvaluationStore();
  } else {
    const { LocalEvaluationStore } = await import("@/lib/evaluations/LocalEvaluationStore");
    cached = new LocalEvaluationStore();
  }
  return cached;
}
