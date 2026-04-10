"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { ArticleReview } from "@/lib/agents/types";
import { formatCostNOK } from "@/lib/cost";

function scoreColor(score: number): string {
  if (score <= 2) return "bg-red-100 text-red-800";
  if (score === 3) return "bg-amber-100 text-amber-800";
  return "bg-green-100 text-green-800";
}

function overallColor(score: number): string {
  if (score <= 2) return "bg-red-600";
  if (score === 3) return "bg-amber-500";
  return "bg-atea-green";
}

export function ReviewPanel({
  review,
  onFixIssues,
}: {
  review: ArticleReview;
  onFixIssues?: (feedback: string) => void;
}) {
  const { t } = useTranslation();

  function handleFix() {
    if (!onFixIssues) return;
    const feedback = review.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n");
    onFixIssues(feedback);
  }

  return (
    <div className="mt-6 rounded-lg border border-black/10 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-atea-navy">{t("reviewer.title")}</h3>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${overallColor(review.overallScore)}`}
          >
            {review.overallScore}
          </span>
          {onFixIssues && review.suggestions.length > 0 && (
            <button
              type="button"
              onClick={handleFix}
              className="rounded bg-atea-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-atea-red/90"
            >
              {t("reviewer.fixIssues")}
            </button>
          )}
        </div>
      </div>

      {/* Dimensions grid */}
      <div className="mb-4 grid gap-2">
        {review.dimensions.map((dim) => (
          <div
            key={dim.dimension}
            className="flex items-start gap-3 rounded border border-black/5 bg-atea-sand/30 px-3 py-2"
          >
            <span
              className={`mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs font-bold ${scoreColor(dim.score)}`}
            >
              {dim.score}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-atea-navy">{dim.label}</div>
              <div className="mt-0.5 text-[11px] text-black/60">{dim.feedback}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mb-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-black/50">
          {t("reviewer.summary")}
        </div>
        <p className="text-sm text-black/70">{review.summary}</p>
      </div>

      {/* Suggestions */}
      {review.suggestions.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-black/50">
            {t("reviewer.suggestions")}
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-black/70">
            {review.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Meta */}
      <div className="text-[11px] text-black/40">
        {review.model} · {review.inputTokens} → {review.outputTokens} tokens ·{" "}
        {(review.durationMs / 1000).toFixed(1)}s ·{" "}
        {formatCostNOK(review.model, review.inputTokens, review.outputTokens)}
      </div>
    </div>
  );
}
