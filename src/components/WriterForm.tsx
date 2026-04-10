"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownView } from "@/components/MarkdownView";
import { ReviewPanel } from "@/components/ReviewPanel";
import { streamSse } from "@/lib/sseClient";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { ArticleReview, ResearchMaterial } from "@/lib/agents/types";
import { formatCost } from "@/lib/cost";

type RunStatus = "idle" | "streaming" | "done" | "error";
type ReviewStatus = "idle" | "streaming" | "done" | "error";

interface RunMeta {
  model?: string;
  promptVersion?: string;
  articleId?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  warnings?: string[];
}

export function WriterForm() {
  const router = useRouter();
  const { t, lang } = useTranslation();

  const RESEARCH_KINDS: Array<{ value: ResearchMaterial["kind"]; label: string }> = [
    { value: "transcript", label: t("writer.kindTranscript") },
    { value: "survey-data", label: t("writer.kindSurvey") },
    { value: "notes", label: t("writer.kindNotes") },
    { value: "reference-article", label: t("writer.kindReference") },
  ];

  const [topic, setTopic] = useState("");
  const [brief, setBrief] = useState("");
  const [targetLengthWords, setTargetLengthWords] = useState(750);
  const [styleNotes, setStyleNotes] = useState("");
  const [research, setResearch] = useState<ResearchMaterial[]>([]);

  const [status, setStatus] = useState<RunStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [meta, setMeta] = useState<RunMeta>({});
  const abortRef = useRef<AbortController | null>(null);

  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("idle");
  const [reviewData, setReviewData] = useState<ArticleReview | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "streaming") return;

    setStatus("streaming");
    setErrorMessage(null);
    setMarkdown("");
    setMeta({});
    setReviewStatus("idle");
    setReviewData(null);
    setReviewError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    let finalMarkdown = "";
    let finalArticleId = "";

    try {
      await streamSse({
        url: "/api/write",
        body: {
          topic,
          brief,
          targetLengthWords,
          researchMaterial: research.length > 0 ? research : undefined,
          styleNotes: styleNotes || undefined,
        },
        signal: controller.signal,
        onEvent(ev) {
          if (ev.type === "start") {
            setMeta((m) => ({ ...m, model: ev.model, promptVersion: ev.promptVersion }));
          } else if (ev.type === "delta") {
            finalMarkdown += ev.text;
            setMarkdown((prev) => prev + ev.text);
          } else if (ev.type === "done") {
            const r = ev.result as
              | {
                  articleId: string;
                  inputTokens: number;
                  outputTokens: number;
                  durationMs: number;
                  warnings: string[];
                }
              | undefined;
            finalArticleId = r?.articleId ?? "";
            setMeta((m) => ({
              ...m,
              articleId: r?.articleId,
              inputTokens: r?.inputTokens,
              outputTokens: r?.outputTokens,
              durationMs: r?.durationMs,
              warnings: r?.warnings,
            }));
            setStatus("done");
          } else if (ev.type === "error") {
            setErrorMessage(ev.message);
            setStatus("error");
          }
        },
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setStatus("idle");
        return;
      }
      setErrorMessage((err as Error).message);
      setStatus("error");
    }

    // Auto-trigger quality review after writer finishes.
    // Pass brief/topic explicitly to avoid stale-closure issues.
    if (finalArticleId && finalMarkdown) {
      triggerReview(finalArticleId, finalMarkdown, topic, brief);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  async function triggerReview(articleId: string, md: string, t_topic: string, t_brief: string) {
    setReviewStatus("streaming");
    setReviewError(null);
    try {
      await streamSse({
        url: "/api/review",
        body: { articleId, markdown: md, brief: t_brief, topic: t_topic },
        onEvent(ev) {
          if (ev.type === "done") {
            const r = ev.result as { review: ArticleReview } | undefined;
            if (r?.review) setReviewData(r.review);
            setReviewStatus("done");
          } else if (ev.type === "error") {
            setReviewError(ev.message);
            setReviewStatus("error");
          }
        },
      });
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : String(err));
      setReviewStatus("error");
    }
  }

  function addResearch() {
    setResearch((r) => [...r, { kind: "transcript", label: "", content: "" }]);
  }
  function updateResearch(idx: number, patch: Partial<ResearchMaterial>) {
    setResearch((r) => r.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }
  function removeResearch(idx: number) {
    setResearch((r) => r.filter((_, i) => i !== idx));
  }

  const canOpenArticle = status === "done" && meta.articleId;

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <form onSubmit={submit} className="space-y-5">
        <Field label={t("writer.topicLabel")} required>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t("writer.topicPlaceholder")}
            className="w-full rounded border border-black/15 bg-white px-3 py-2 text-sm"
            required
            minLength={5}
            maxLength={200}
          />
        </Field>

        <Field label={t("writer.briefLabel")} required>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={t("writer.briefPlaceholder")}
            className="min-h-[120px] w-full rounded border border-black/15 bg-white px-3 py-2 text-sm"
            required
            minLength={50}
            maxLength={5000}
          />
          <div className="mt-1 text-[11px] text-black/40">{brief.length}/5000</div>
        </Field>

        <Field label={t("writer.targetLengthLabel")}>
          <input
            type="number"
            min={300}
            max={2000}
            value={targetLengthWords}
            onChange={(e) => setTargetLengthWords(parseInt(e.target.value || "750", 10))}
            className="w-32 rounded border border-black/15 bg-white px-3 py-2 text-sm"
          />
          <span className="ml-2 text-[11px] text-black/50">{t("writer.targetLengthDefault")}</span>
        </Field>

        <Field label={t("writer.styleNotesLabel")}>
          <textarea
            value={styleNotes}
            onChange={(e) => setStyleNotes(e.target.value)}
            placeholder={t("writer.styleNotesPlaceholder")}
            className="min-h-[70px] w-full rounded border border-black/15 bg-white px-3 py-2 text-sm"
            maxLength={2000}
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-black/60">
              {t("writer.researchLabel")}
            </span>
            <button
              type="button"
              onClick={addResearch}
              className="rounded border border-black/15 bg-white px-2 py-1 text-[11px] font-medium text-atea-navy hover:bg-atea-sand"
            >
              {t("writer.addResearch")}
            </button>
          </div>
          {research.length === 0 && (
            <div className="rounded border border-dashed border-black/15 bg-white/50 p-3 text-[11px] text-black/40">
              {t("writer.noResearch")}
            </div>
          )}
          {research.map((item, idx) => (
            <div key={idx} className="mb-2 space-y-2 rounded border border-black/10 bg-white p-3">
              <div className="flex items-center gap-2">
                <select
                  value={item.kind}
                  onChange={(e) =>
                    updateResearch(idx, { kind: e.target.value as ResearchMaterial["kind"] })
                  }
                  className="rounded border border-black/15 bg-white px-2 py-1 text-xs"
                >
                  {RESEARCH_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateResearch(idx, { label: e.target.value })}
                  placeholder={t("writer.shortLabel")}
                  className="flex-1 rounded border border-black/15 bg-white px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => removeResearch(idx)}
                  className="text-[11px] text-black/40 hover:text-atea-red"
                >
                  {t("common.remove")}
                </button>
              </div>
              <textarea
                value={item.content}
                onChange={(e) => updateResearch(idx, { content: e.target.value })}
                placeholder={t("writer.pasteContent")}
                className="min-h-[80px] w-full rounded border border-black/15 bg-white px-2 py-1 text-xs font-mono"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={status === "streaming"}
            className="rounded bg-atea-green px-4 py-2 text-sm font-semibold text-white hover:bg-atea-green/90 disabled:opacity-50"
          >
            {status === "streaming" ? t("writer.generating") : t("writer.generate")}
          </button>
          {status === "streaming" && (
            <button
              type="button"
              onClick={cancel}
              className="rounded border border-black/15 bg-white px-4 py-2 text-sm text-black/70 hover:bg-atea-sand"
            >
              {t("common.cancel")}
            </button>
          )}
          {canOpenArticle && (
            <button
              type="button"
              onClick={() => router.push(`/articles/${meta.articleId}`)}
              className="ml-auto rounded bg-atea-red px-4 py-2 text-sm font-semibold text-white hover:bg-atea-red/90"
            >
              {t("writer.openArticle")}
            </button>
          )}
        </div>
      </form>

      <div className="min-h-[400px] rounded-lg border border-black/10 bg-white p-6">
        <div className="mb-3 flex items-center justify-between border-b border-black/10 pb-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-black/60">
            {t("writer.draft")}
          </div>
          <StatusBadge
            status={status}
            model={meta.model}
            promptVersion={meta.promptVersion}
          />
        </div>

        {status === "idle" && !markdown && (
          <div className="flex h-64 items-center justify-center text-sm text-black/30">
            {t("writer.draftPlaceholder")}
          </div>
        )}

        {errorMessage && (
          <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {t("common.errorPrefix")} {errorMessage}
          </div>
        )}

        {markdown && <MarkdownView markdown={markdown} streaming={status === "streaming"} />}

        {status === "done" && (
          <footer className="mt-6 border-t border-black/10 pt-3 text-[11px] text-black/50">
            {t("common.done")} · {meta.inputTokens} → {meta.outputTokens} tokens ·{" "}
            {meta.durationMs ? `${(meta.durationMs / 1000).toFixed(1)}s` : "—"} ·{" "}
            {meta.model && meta.inputTokens && meta.outputTokens
              ? formatCost(meta.model, meta.inputTokens, meta.outputTokens, lang)
              : ""}
            {meta.warnings && meta.warnings.length > 0 && (
              <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-amber-800">
                ⚠ {meta.warnings.join(" · ")}
              </div>
            )}
          </footer>
        )}

        {reviewStatus === "streaming" && (
          <div className="mt-4 flex items-center gap-2 rounded bg-atea-navy/5 px-3 py-2 text-xs text-atea-navy">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-atea-navy/30 border-t-atea-navy" />
            {t("reviewer.autoReview")}
          </div>
        )}
        {reviewStatus === "error" && (
          <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {t("reviewer.title")}: {reviewError ?? t("common.error")}
          </div>
        )}
        {reviewStatus === "done" && reviewData && (
          <ReviewPanel review={reviewData} />
        )}
      </div>
    </div>
  );
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

function StatusBadge({
  status,
  model,
  promptVersion,
}: {
  status: RunStatus;
  model?: string;
  promptVersion?: string;
}) {
  const { t } = useTranslation();

  if (status === "idle") return null;
  const label: Record<Exclude<RunStatus, "idle">, string> = {
    streaming: t("common.streaming"),
    done: t("common.done"),
    error: t("common.error"),
  };
  const colors: Record<Exclude<RunStatus, "idle">, string> = {
    streaming: "bg-atea-navy/10 text-atea-navy",
    done: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={`rounded px-2 py-0.5 font-semibold ${colors[status]}`}>
        {label[status]}
      </span>
      {model && <span className="text-black/50">{model}</span>}
      {promptVersion && <span className="text-black/30">· {promptVersion}</span>}
    </div>
  );
}
