"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { formatAmount } from "@/lib/cost";

interface ModelRow {
  model: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  costNOK: number;
  count: number;
}

interface OpRow {
  operation: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  costNOK: number;
  count: number;
}

interface DimensionAvg {
  dimension: string;
  label: string;
  avgScore: number;
  count: number;
}

interface QualityGroup {
  group: string;
  avgOverall: number;
  count: number;
  dimensions: DimensionAvg[];
}

interface Stats {
  totalArticles: number;
  totalTranslations: number;
  totalRevisions: number;
  totalReviews: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalThinkingTokens: number;
  totalCostNOK: number;
  byModel: ModelRow[];
  byOperation: OpRow[];
  qualityByModel: QualityGroup[];
  qualityByPromptVersion: QualityGroup[];
}

function formatKr(n: number, lang: "en" | "no"): string {
  return formatAmount(n, lang);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const OP_LABELS: Record<string, Record<string, string>> = {
  writer: { en: "Writer", no: "Skribent" },
  translator: { en: "Translator", no: "Oversetter" },
  reviser: { en: "Reviser", no: "Revisjon" },
  reviewer: { en: "Reviewer", no: "Kvalitetsvurdering" },
};

export function StatisticsClient() {
  const { t, lang } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/statistics")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setStats(data as Stats))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">
        {t("common.errorPrefix")} {error}
      </div>
    );
  }

  if (!stats) {
    return <div className="text-sm text-black/40">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label={t("stats.articles")} value={String(stats.totalArticles)} />
        <Card label={t("stats.translations")} value={String(stats.totalTranslations)} />
        <Card label={t("stats.revisions")} value={String(stats.totalRevisions)} />
        <Card label={t("stats.reviews")} value={String(stats.totalReviews)} />
      </div>

      {/* Total cost */}
      <div className="rounded-lg border border-black/10 bg-white p-6">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-black/50">
          {t("stats.totalCost")}
        </div>
        <div className="text-3xl font-bold text-atea-navy">
          {formatKr(stats.totalCostNOK, lang)}
        </div>
        <div className="mt-1 text-xs text-black/40">
          {formatTokens(stats.totalInputTokens)} input + {formatTokens(stats.totalOutputTokens)} output
          {stats.totalThinkingTokens > 0 && ` + ${formatTokens(stats.totalThinkingTokens)} thinking`} tokens
        </div>
      </div>

      {/* By operation */}
      <div className="rounded-lg border border-black/10 bg-white">
        <div className="border-b border-black/10 px-5 py-3">
          <div className="text-sm font-semibold text-atea-navy">{t("stats.byOperation")}</div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-[11px] font-semibold uppercase tracking-wider text-black/50">
              <th className="px-5 py-2">{t("stats.operation")}</th>
              <th className="px-5 py-2 text-right">{t("stats.count")}</th>
              <th className="px-5 py-2 text-right">{t("stats.inputTokens")}</th>
              <th className="px-5 py-2 text-right">{t("stats.outputTokens")}</th>
              <th className="px-5 py-2 text-right">{t("stats.thinkingTokens")}</th>
              <th className="px-5 py-2 text-right">{t("stats.cost")}</th>
            </tr>
          </thead>
          <tbody>
            {stats.byOperation.map((row) => (
              <tr key={row.operation} className="border-b border-black/5 last:border-0">
                <td className="px-5 py-2.5 font-medium text-atea-navy">
                  {OP_LABELS[row.operation]?.[lang] ?? row.operation}
                </td>
                <td className="px-5 py-2.5 text-right text-black/60">{row.count}</td>
                <td className="px-5 py-2.5 text-right text-black/60">{formatTokens(row.inputTokens)}</td>
                <td className="px-5 py-2.5 text-right text-black/60">{formatTokens(row.outputTokens)}</td>
                <td className="px-5 py-2.5 text-right text-black/60">{row.thinkingTokens > 0 ? formatTokens(row.thinkingTokens) : "—"}</td>
                <td className="px-5 py-2.5 text-right font-medium">{formatKr(row.costNOK, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* By model */}
      <div className="rounded-lg border border-black/10 bg-white">
        <div className="border-b border-black/10 px-5 py-3">
          <div className="text-sm font-semibold text-atea-navy">{t("stats.byModel")}</div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-[11px] font-semibold uppercase tracking-wider text-black/50">
              <th className="px-5 py-2">{t("stats.model")}</th>
              <th className="px-5 py-2 text-right">{t("stats.count")}</th>
              <th className="px-5 py-2 text-right">{t("stats.inputTokens")}</th>
              <th className="px-5 py-2 text-right">{t("stats.outputTokens")}</th>
              <th className="px-5 py-2 text-right">{t("stats.thinkingTokens")}</th>
              <th className="px-5 py-2 text-right">{t("stats.cost")}</th>
            </tr>
          </thead>
          <tbody>
            {stats.byModel.map((row) => (
              <tr key={row.model} className="border-b border-black/5 last:border-0">
                <td className="px-5 py-2.5 font-medium text-atea-navy">{row.model}</td>
                <td className="px-5 py-2.5 text-right text-black/60">{row.count}</td>
                <td className="px-5 py-2.5 text-right text-black/60">{formatTokens(row.inputTokens)}</td>
                <td className="px-5 py-2.5 text-right text-black/60">{formatTokens(row.outputTokens)}</td>
                <td className="px-5 py-2.5 text-right text-black/60">{row.thinkingTokens > 0 ? formatTokens(row.thinkingTokens) : "—"}</td>
                <td className="px-5 py-2.5 text-right font-medium">{formatKr(row.costNOK, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quality by model */}
      <QualitySection
        title={t("eval.qualityByModel")}
        groupLabel={t("eval.group")}
        groups={stats.qualityByModel}
        noDataText={t("eval.noReviews")}
        lang={lang}
      />

      {/* Quality by prompt version */}
      <QualitySection
        title={t("eval.qualityByPrompt")}
        groupLabel={t("eval.promptGroup")}
        groups={stats.qualityByPromptVersion}
        noDataText={t("eval.noReviews")}
        lang={lang}
      />

      {/* Disclaimer */}
      <div className="text-[11px] text-black/30">
        {t("stats.disclaimer")}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-black/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-atea-navy">{value}</div>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 4.5) return "bg-green-100 text-green-800";
  if (score >= 3.5) return "bg-emerald-50 text-emerald-700";
  if (score >= 2.5) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-sm font-bold ${scoreColor(score)}`}>
      {score.toFixed(1)}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 5) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-black/5">
        <div
          className={`h-full rounded-full ${score >= 4 ? "bg-green-500" : score >= 3 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-black/60">{score.toFixed(1)}</span>
    </div>
  );
}

function QualitySection({
  title,
  groupLabel,
  groups,
  noDataText,
  lang,
}: {
  title: string;
  groupLabel: string;
  groups: QualityGroup[];
  noDataText: string;
  lang: "en" | "no";
}) {
  const { t } = useTranslation();

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-black/10 bg-white p-6">
        <div className="text-sm font-semibold text-atea-navy">{title}</div>
        <div className="mt-3 text-xs text-black/40">{noDataText}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white">
      <div className="border-b border-black/10 px-5 py-3">
        <div className="text-sm font-semibold text-atea-navy">{title}</div>
      </div>
      <div className="divide-y divide-black/5">
        {groups.map((g) => (
          <div key={g.group} className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-atea-navy">{g.group}</span>
                <span className="ml-2 text-[11px] text-black/40">
                  {g.count} {t("eval.reviewedArticles").toLowerCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-black/40">{t("eval.avgOverall")}</span>
                <ScoreBadge score={g.avgOverall} />
                <span className="text-[11px] text-black/30">{t("eval.scoreOf5")}</span>
              </div>
            </div>
            {g.dimensions.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {g.dimensions.map((d) => (
                  <div key={d.dimension} className="flex items-center justify-between rounded bg-black/[0.02] px-3 py-1.5">
                    <span className="text-xs text-black/60">{d.label}</span>
                    <ScoreBar score={d.avgScore} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
