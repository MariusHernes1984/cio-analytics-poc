"use client";

import { useEffect, useMemo, useState } from "react";
import { MarkdownView } from "@/components/MarkdownView";
import { ReviewPanel } from "@/components/ReviewPanel";
import { formatCost } from "@/lib/cost";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { EvaluationCase, EvaluationRun, EvalVerdictStatus } from "@/lib/evaluations/EvaluationStore";
import type { PromptVersion, PromptVersionMeta } from "@/lib/prompts/PromptStore";

interface PromptResponse {
  current: PromptVersion;
  versions: PromptVersionMeta[];
}

type LoadState = "loading" | "ready" | "error";

export function EvaluationsClient() {
  const { t, lang } = useTranslation();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<EvaluationCase[]>([]);
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [promptVersions, setPromptVersions] = useState<PromptVersionMeta[]>([]);
  const [selectedPromptVersion, setSelectedPromptVersion] = useState<string>("");
  const [runningCaseId, setRunningCaseId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [brief, setBrief] = useState("");
  const [targetLengthWords, setTargetLengthWords] = useState(750);
  const [researchText, setResearchText] = useState("");
  const [criteria, setCriteria] = useState("");
  const [expectedNotes, setExpectedNotes] = useState("");
  const [savingCase, setSavingCase] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const runsByCase = useMemo(() => {
    const map = new Map<string, EvaluationRun[]>();
    for (const run of runs) {
      const current = map.get(run.caseId) ?? [];
      current.push(run);
      map.set(run.caseId, current);
    }
    return map;
  }, [runs]);

  async function load() {
    setLoadState("loading");
    setError(null);
    try {
      const [caseData, runData, promptData] = await Promise.all([
        fetchJson<{ cases: EvaluationCase[] }>("/api/evaluations/cases"),
        fetchJson<{ runs: EvaluationRun[] }>("/api/evaluations/runs"),
        fetchJson<PromptResponse>("/api/prompts/writer"),
      ]);
      setCases(caseData.cases);
      setRuns(runData.runs);
      setPromptVersions(promptData.versions);
      setSelectedPromptVersion(promptData.current.version);
      setLoadState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoadState("error");
    }
  }

  async function createCase(e: React.FormEvent) {
    e.preventDefault();
    setSavingCase(true);
    setError(null);
    try {
      const payload = {
        name,
        topic,
        brief,
        targetLengthWords,
        researchMaterial: researchText.trim()
          ? [{ kind: "notes" as const, label: t("evaluations.researchLabel"), content: researchText.trim() }]
          : undefined,
        criteria: criteria.trim() || undefined,
        expectedNotes: expectedNotes.trim() || undefined,
      };
      const created = await fetchJson<EvaluationCase>("/api/evaluations/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setCases((prev) => [created, ...prev]);
      setName("");
      setTopic("");
      setBrief("");
      setTargetLengthWords(750);
      setResearchText("");
      setCriteria("");
      setExpectedNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingCase(false);
    }
  }

  async function runCase(caseId: string) {
    setRunningCaseId(caseId);
    setError(null);
    try {
      const run = await fetchJson<EvaluationRun>("/api/evaluations/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          promptVersion: selectedPromptVersion || undefined,
        }),
      });
      setRuns((prev) => [run, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunningCaseId(null);
    }
  }

  async function setVerdict(runId: string, status: EvalVerdictStatus) {
    setError(null);
    try {
      const updated = await fetchJson<EvaluationRun>(`/api/evaluations/runs/${runId}/verdict`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setRuns((prev) => prev.map((run) => (run.id === runId ? updated : run)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (loadState === "loading") {
    return <div className="text-sm text-black/40">{t("common.loading")}</div>;
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[440px_1fr]">
      <section className="space-y-4">
        {error && (
          <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">
            {t("common.errorPrefix")} {error}
          </div>
        )}

        <form onSubmit={createCase} className="rounded-lg border border-black/10 bg-white p-6">
          <div className="mb-4 text-sm font-semibold text-atea-navy">
            {t("evaluations.createCase")}
          </div>
          <div className="space-y-4">
            <Field label={t("evaluations.caseName")} required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-black/15 px-3 py-2 text-sm"
                required
                minLength={3}
                maxLength={160}
              />
            </Field>
            <Field label={t("writer.topicLabel")} required>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded border border-black/15 px-3 py-2 text-sm"
                required
                minLength={5}
                maxLength={200}
              />
            </Field>
            <Field label={t("writer.briefLabel")} required>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="min-h-[120px] w-full rounded border border-black/15 px-3 py-2 text-sm"
                required
                minLength={50}
                maxLength={5000}
              />
            </Field>
            <Field label={t("writer.targetLengthLabel")}>
              <input
                type="number"
                min={300}
                max={2000}
                value={targetLengthWords}
                onChange={(e) => setTargetLengthWords(parseInt(e.target.value || "750", 10))}
                className="w-32 rounded border border-black/15 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("evaluations.researchMaterial")}>
              <textarea
                value={researchText}
                onChange={(e) => setResearchText(e.target.value)}
                className="min-h-[90px] w-full rounded border border-black/15 px-3 py-2 text-sm font-mono"
                maxLength={50_000}
              />
            </Field>
            <Field label={t("evaluations.criteria")}>
              <textarea
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                className="min-h-[80px] w-full rounded border border-black/15 px-3 py-2 text-sm"
                maxLength={4000}
              />
            </Field>
            <Field label={t("evaluations.expectedNotes")}>
              <textarea
                value={expectedNotes}
                onChange={(e) => setExpectedNotes(e.target.value)}
                className="min-h-[80px] w-full rounded border border-black/15 px-3 py-2 text-sm"
                maxLength={4000}
              />
            </Field>
            <button
              type="submit"
              disabled={savingCase}
              className="rounded bg-atea-green px-4 py-2 text-sm font-semibold text-white hover:bg-atea-green/90 disabled:opacity-50"
            >
              {savingCase ? t("common.saving") : t("evaluations.saveCase")}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-black/10 bg-white p-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-black/50">
              {t("evaluations.promptVersion")}
            </div>
            <select
              value={selectedPromptVersion}
              onChange={(e) => setSelectedPromptVersion(e.target.value)}
              className="mt-1 rounded border border-black/15 bg-white px-3 py-1.5 text-sm"
            >
              {promptVersions.map((version) => (
                <option key={version.version} value={version.version}>
                  {version.version} · {version.changeNote}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-black/40">
            {cases.length} {t("evaluations.cases")} · {runs.length} {t("evaluations.runs")}
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/15 bg-white/50 p-10 text-center text-sm text-black/40">
            {t("evaluations.empty")}
          </div>
        ) : (
          cases.map((evalCase) => (
            <EvaluationCaseCard
              key={evalCase.id}
              evalCase={evalCase}
              runs={runsByCase.get(evalCase.id) ?? []}
              running={runningCaseId === evalCase.id}
              onRun={() => runCase(evalCase.id)}
              onVerdict={setVerdict}
            />
          ))
        )}
      </section>
    </div>
  );
}

function EvaluationCaseCard({
  evalCase,
  runs,
  running,
  onRun,
  onVerdict,
}: {
  evalCase: EvaluationCase;
  runs: EvaluationRun[];
  running: boolean;
  onRun: () => void;
  onVerdict: (runId: string, status: EvalVerdictStatus) => Promise<void>;
}) {
  const { t, lang } = useTranslation();
  const latest = runs[0];

  return (
    <article className="rounded-lg border border-black/10 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-atea-navy">{evalCase.name}</h2>
          <p className="mt-1 text-sm text-black/60">{evalCase.topic}</p>
          <div className="mt-1 text-[11px] text-black/40">
            {runs.length} {t("evaluations.runs")} · {t("writer.targetLengthLabel")}:{" "}
            {evalCase.targetLengthWords ?? 750}
          </div>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="rounded bg-atea-red px-4 py-2 text-sm font-semibold text-white hover:bg-atea-red/90 disabled:opacity-50"
        >
          {running ? t("evaluations.running") : t("evaluations.run")}
        </button>
      </div>

      {latest && (
        <div className="border-b border-black/5 bg-atea-sand/30 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-black/60">
            <span className="rounded bg-white px-2 py-1 font-semibold text-atea-navy">
              {t("evaluations.latestScore")}: {latest.review.overallScore}/5
            </span>
            <span>{latest.writerModel}</span>
            <span>·</span>
            <span>{latest.writerPromptVersion}</span>
            <span>·</span>
            <span>
              {formatCost(
                latest.writerModel,
                latest.writerResult.inputTokens,
                latest.writerResult.outputTokens,
                lang,
                latest.writerResult.thinkingTokens ?? 0,
              )}
            </span>
            {latest.humanVerdict && (
              <>
                <span>·</span>
                <VerdictBadge status={latest.humanVerdict.status} />
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 px-5 py-4">
        {runs.length === 0 ? (
          <div className="text-sm text-black/40">{t("evaluations.noRuns")}</div>
        ) : (
          runs.map((run) => (
            <details key={run.id} className="rounded border border-black/10 bg-white p-4">
              <summary className="cursor-pointer text-sm font-medium text-atea-navy">
                {new Date(run.createdAt).toLocaleString(lang === "no" ? "nb-NO" : "en-GB")} ·{" "}
                {run.writerPromptVersion} · {run.review.overallScore}/5
              </summary>
              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-black/50">
                    {t("evaluations.generatedArticle")}
                  </div>
                  <div className="max-h-[560px] overflow-auto rounded border border-black/10 bg-atea-sand/20 p-4">
                    <MarkdownView markdown={run.writerResult.markdown} />
                  </div>
                </div>
                <div>
                  <ReviewPanel review={run.review} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => onVerdict(run.id, "approved")}
                      className="rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                    >
                      {t("evaluations.approve")}
                    </button>
                    <button
                      onClick={() => onVerdict(run.id, "needs-work")}
                      className="rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                    >
                      {t("evaluations.needsWork")}
                    </button>
                    <button
                      onClick={() => onVerdict(run.id, "rejected")}
                      className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      {t("evaluations.reject")}
                    </button>
                  </div>
                </div>
              </div>
            </details>
          ))
        )}
      </div>
    </article>
  );
}

function VerdictBadge({ status }: { status: EvalVerdictStatus }) {
  const { t } = useTranslation();
  const classes: Record<EvalVerdictStatus, string> = {
    approved: "bg-green-100 text-green-800",
    "needs-work": "bg-amber-100 text-amber-800",
    rejected: "bg-red-100 text-red-800",
  };
  const labels: Record<EvalVerdictStatus, string> = {
    approved: t("evaluations.approved"),
    "needs-work": t("evaluations.needsWork"),
    rejected: t("evaluations.rejected"),
  };
  return <span className={`rounded px-2 py-0.5 font-semibold ${classes[status]}`}>{labels[status]}</span>;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-black/60">
        {label}
        {required && <span className="text-atea-red">*</span>}
      </span>
      {children}
    </label>
  );
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(typeof err.error === "string" ? err.error : `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
