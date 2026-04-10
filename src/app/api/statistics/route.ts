import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/requireSession";
import { getArticleStore } from "@/lib/articles/ArticleStore";
import type { StoredArticle } from "@/lib/articles/ArticleStore";
import { estimateCostNOK } from "@/lib/cost";

export const dynamic = "force-dynamic";

interface ModelStats {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costNOK: number;
  count: number;
}

interface OperationStats {
  operation: string;
  inputTokens: number;
  outputTokens: number;
  costNOK: number;
  count: number;
}

function addResult(
  byModel: Map<string, ModelStats>,
  byOp: Map<string, OperationStats>,
  model: string,
  inputTokens: number,
  outputTokens: number,
  operation: string,
) {
  const cost = estimateCostNOK(model, inputTokens, outputTokens);

  // By model
  const m = byModel.get(model) ?? { model, inputTokens: 0, outputTokens: 0, costNOK: 0, count: 0 };
  m.inputTokens += inputTokens;
  m.outputTokens += outputTokens;
  m.costNOK += cost;
  m.count += 1;
  byModel.set(model, m);

  // By operation
  const o = byOp.get(operation) ?? { operation, inputTokens: 0, outputTokens: 0, costNOK: 0, count: 0 };
  o.inputTokens += inputTokens;
  o.outputTokens += outputTokens;
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

  for (const item of items) {
    const article: StoredArticle | null = await store.get(item.id);
    if (!article) continue;

    totalArticles++;

    // Writer (current source)
    addResult(byModel, byOp, article.source.model, article.source.inputTokens, article.source.outputTokens, "writer");

    // Revisions
    if (article.revisions) {
      for (const rev of article.revisions) {
        totalRevisions++;
        addResult(byModel, byOp, rev.result.model, rev.result.inputTokens, rev.result.outputTokens, "reviser");
      }
    }

    // Translations
    for (const [, result] of Object.entries(article.translations)) {
      if (!result) continue;
      totalTranslations++;
      addResult(byModel, byOp, result.model, result.inputTokens, result.outputTokens, "translator");
    }

    // Review
    if (article.review) {
      totalReviews++;
      addResult(byModel, byOp, article.review.model, article.review.inputTokens, article.review.outputTokens, "reviewer");
    }
  }

  const totalInputTokens = [...byModel.values()].reduce((s, m) => s + m.inputTokens, 0);
  const totalOutputTokens = [...byModel.values()].reduce((s, m) => s + m.outputTokens, 0);
  const totalCostNOK = [...byModel.values()].reduce((s, m) => s + m.costNOK, 0);

  return NextResponse.json({
    totalArticles,
    totalTranslations,
    totalRevisions,
    totalReviews,
    totalInputTokens,
    totalOutputTokens,
    totalCostNOK,
    byModel: [...byModel.values()].sort((a, b) => b.costNOK - a.costNOK),
    byOperation: [...byOp.values()].sort((a, b) => b.costNOK - a.costNOK),
  });
}
