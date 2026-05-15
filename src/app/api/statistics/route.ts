import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/requireSession";
import { getArticleStore } from "@/lib/articles/ArticleStore";
import { getEvaluationStore } from "@/lib/evaluations/EvaluationStore";
import type { StoredArticle } from "@/lib/articles/ArticleStore";
import type { ArticleReview } from "@/lib/agents/types";
import { estimateCostNOK } from "@/lib/cost";

export const dynamic = "force-dynamic";

interface ModelStats {
  model: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  costNOK: number;
  count: number;
}

interface OperationStats {
  operation: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  costNOK: number;
  count: number;
}

/* ── Quality evaluation aggregation ─────────────────────── */

interface DimensionAvg {
  dimension: string;
  label: string;
  avgScore: number;
  count: number;
}

interface QualityByGroup {
  group: string; // model name or prompt version
  avgOverall: number;
  count: number;
  dimensions: DimensionAvg[];
}

interface QualityAccumulator {
  totalScore: number;
  count: number;
  dimensions: Map<string, { label: string; totalScore: number; count: number }>;
}

function newAccumulator(): QualityAccumulator {
  return { totalScore: 0, count: 0, dimensions: new Map() };
}

function addReview(acc: QualityAccumulator, review: ArticleReview) {
  acc.totalScore += review.overallScore;
  acc.count += 1;
  for (const dim of review.dimensions) {
    const d = acc.dimensions.get(dim.dimension) ?? { label: dim.label, totalScore: 0, count: 0 };
    d.totalScore += dim.score;
    d.count += 1;
    acc.dimensions.set(dim.dimension, d);
  }
}

function finalizeAccumulator(group: string, acc: QualityAccumulator): QualityByGroup {
  return {
    group,
    avgOverall: acc.count > 0 ? Math.round((acc.totalScore / acc.count) * 10) / 10 : 0,
    count: acc.count,
    dimensions: [...acc.dimensions.entries()].map(([dim, d]) => ({
      dimension: dim,
      label: d.label,
      avgScore: d.count > 0 ? Math.round((d.totalScore / d.count) * 10) / 10 : 0,
      count: d.count,
    })),
  };
}

/* ── Cost aggregation ──────────────────────────────────── */

function addResult(
  byModel: Map<string, ModelStats>,
  byOp: Map<string, OperationStats>,
  model: string,
  inputTokens: number,
  outputTokens: number,
  operation: string,
  thinkingTokens: number = 0,
) {
  const cost = estimateCostNOK(model, inputTokens, outputTokens, thinkingTokens);

  // By model
  const m = byModel.get(model) ?? { model, inputTokens: 0, outputTokens: 0, thinkingTokens: 0, costNOK: 0, count: 0 };
  m.inputTokens += inputTokens;
  m.outputTokens += outputTokens;
  m.thinkingTokens += thinkingTokens;
  m.costNOK += cost;
  m.count += 1;
  byModel.set(model, m);

  // By operation
  const o = byOp.get(operation) ?? { operation, inputTokens: 0, outputTokens: 0, thinkingTokens: 0, costNOK: 0, count: 0 };
  o.inputTokens += inputTokens;
  o.outputTokens += outputTokens;
  o.thinkingTokens += thinkingTokens;
  o.costNOK += cost;
  o.count += 1;
  byOp.set(operation, o);
}

export async function GET() {
  const session = await requireSession();
  if (!session.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await getArticleStore();
  const items = await store.list();

  const byModel = new Map<string, ModelStats>();
  const byOp = new Map<string, OperationStats>();
  let totalArticles = 0;
  let totalTranslations = 0;
  let totalRevisions = 0;
  let totalReviews = 0;

  // Quality evaluation accumulators
  const qualByModel = new Map<string, QualityAccumulator>();
  const qualByPrompt = new Map<string, QualityAccumulator>();

  for (const item of items) {
    const article: StoredArticle | null = await store.get(item.id);
    if (!article) continue;

    totalArticles++;

    // Writer (current source)
    addResult(byModel, byOp, article.source.model, article.source.inputTokens, article.source.outputTokens, "writer", article.source.thinkingTokens ?? 0);

    // Revisions
    if (article.revisions) {
      for (const rev of article.revisions) {
        totalRevisions++;
        addResult(byModel, byOp, rev.result.model, rev.result.inputTokens, rev.result.outputTokens, "reviser", rev.result.thinkingTokens ?? 0);
      }
    }

    // Translations
    for (const [, result] of Object.entries(article.translations)) {
      if (!result) continue;
      totalTranslations++;
      addResult(byModel, byOp, result.model, result.inputTokens, result.outputTokens, "translator", result.thinkingTokens ?? 0);
    }

    // Review
    if (article.review) {
      totalReviews++;
      addResult(byModel, byOp, article.review.model, article.review.inputTokens, article.review.outputTokens, "reviewer", article.review.thinkingTokens ?? 0);

      // Quality aggregation — group by the WRITER model and prompt version
      const writerModel = article.source.model;
      const writerPrompt = article.source.promptVersion;

      if (!qualByModel.has(writerModel)) qualByModel.set(writerModel, newAccumulator());
      addReview(qualByModel.get(writerModel)!, article.review);

      if (!qualByPrompt.has(writerPrompt)) qualByPrompt.set(writerPrompt, newAccumulator());
      addReview(qualByPrompt.get(writerPrompt)!, article.review);
    }
  }

  const totalInputTokens = [...byModel.values()].reduce((s, m) => s + m.inputTokens, 0);
  const totalOutputTokens = [...byModel.values()].reduce((s, m) => s + m.outputTokens, 0);
  const totalThinkingTokens = [...byModel.values()].reduce((s, m) => s + m.thinkingTokens, 0);
  const totalCostNOK = [...byModel.values()].reduce((s, m) => s + m.costNOK, 0);

  // Finalize quality accumulators
  const qualityByModel = [...qualByModel.entries()]
    .map(([group, acc]) => finalizeAccumulator(group, acc))
    .sort((a, b) => b.avgOverall - a.avgOverall);

  const qualityByPromptVersion = [...qualByPrompt.entries()]
    .map(([group, acc]) => finalizeAccumulator(group, acc))
    .sort((a, b) => b.avgOverall - a.avgOverall);

  const evaluationStore = await getEvaluationStore();
  const evalCases = await evaluationStore.listCases();
  const evalRuns = await evaluationStore.listRuns();
  const evalByModel = new Map<string, QualityAccumulator>();
  const evalByPrompt = new Map<string, QualityAccumulator>();
  let evalAcceptedRuns = 0;
  let evalTotalCostNOK = 0;
  const evalOverall = newAccumulator();

  for (const run of evalRuns) {
    addReview(evalOverall, run.review);
    if (!evalByModel.has(run.writerModel)) evalByModel.set(run.writerModel, newAccumulator());
    addReview(evalByModel.get(run.writerModel)!, run.review);
    if (!evalByPrompt.has(run.writerPromptVersion)) {
      evalByPrompt.set(run.writerPromptVersion, newAccumulator());
    }
    addReview(evalByPrompt.get(run.writerPromptVersion)!, run.review);
    if (run.humanVerdict?.status === "approved") evalAcceptedRuns++;
    evalTotalCostNOK += estimateCostNOK(
      run.writerModel,
      run.writerResult.inputTokens,
      run.writerResult.outputTokens,
      run.writerResult.thinkingTokens ?? 0,
    );
    evalTotalCostNOK += estimateCostNOK(
      run.review.model,
      run.review.inputTokens,
      run.review.outputTokens,
      run.review.thinkingTokens ?? 0,
    );
  }

  return NextResponse.json({
    totalArticles,
    totalTranslations,
    totalRevisions,
    totalReviews,
    totalInputTokens,
    totalOutputTokens,
    totalThinkingTokens,
    totalCostNOK,
    byModel: [...byModel.values()].sort((a, b) => b.costNOK - a.costNOK),
    byOperation: [...byOp.values()].sort((a, b) => b.costNOK - a.costNOK),
    qualityByModel,
    qualityByPromptVersion,
    evaluations: {
      totalCases: evalCases.length,
      totalRuns: evalRuns.length,
      acceptedRuns: evalAcceptedRuns,
      acceptanceRate: evalRuns.length > 0 ? Math.round((evalAcceptedRuns / evalRuns.length) * 100) : 0,
      avgOverall: evalOverall.count > 0 ? Math.round((evalOverall.totalScore / evalOverall.count) * 10) / 10 : 0,
      totalCostNOK: evalTotalCostNOK,
      qualityByModel: [...evalByModel.entries()]
        .map(([group, acc]) => finalizeAccumulator(group, acc))
        .sort((a, b) => b.avgOverall - a.avgOverall),
      qualityByPromptVersion: [...evalByPrompt.entries()]
        .map(([group, acc]) => finalizeAccumulator(group, acc))
        .sort((a, b) => b.avgOverall - a.avgOverall),
    },
  });
}
