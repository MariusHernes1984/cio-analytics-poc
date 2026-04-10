"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownView } from "@/components/MarkdownView";
import { streamSse } from "@/lib/sseClient";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

type Status = "idle" | "streaming" | "done" | "error";

/**
 * Revision panel shown under the Norwegian tab of an article.
 *
 * Flow:
 *   1. User writes feedback in textarea
 *   2. Click "Start revisjon" → POST /api/revise → stream new markdown
 *   3. When stream completes, the article is already saved server-side
 *      (runReviser → ArticleStore.revise). We just refresh the page so
 *      the new source becomes visible in the main article view.
 *
 * We intentionally keep the stream pane and save step fused: there is no
 * "preview only, discard" option. The reviser is cheap enough to re-run
 * if the user doesn't like the result, and skipping the preview-vs-save
 * distinction removes a whole class of UI state.
 */
export function ArticleReviser({
  articleId,
  initialFeedback = "",
}: {
  articleId: string;
  initialFeedback?: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState("");

  // When initialFeedback changes externally (e.g. from ReviewPanel "Fix issues"),
  // populate the textarea and auto-expand the panel.
  useEffect(() => {
    if (initialFeedback) {
      setFeedback(initialFeedback);
      setExpanded(true);
    }
  }, [initialFeedback]);
  const [status, setStatus] = useState<Status>("idle");
  const [markdown, setMarkdown] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    model?: string;
    promptVersion?: string;
    durationMs?: number;
  }>({});
  const abortRef = useRef<AbortController | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "streaming" || feedback.trim().length < 10) return;

    setStatus("streaming");
    setMarkdown("");
    setErrorMessage(null);
    setMeta({});

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamSse({
        url: "/api/revise",
        body: { articleId, feedback: feedback.trim() },
        signal: controller.signal,
        onEvent(ev) {
          if (ev.type === "start") {
            setMeta((m) => ({ ...m, model: ev.model, promptVersion: ev.promptVersion }));
          } else if (ev.type === "delta") {
            setMarkdown((prev) => prev + ev.text);
          } else if (ev.type === "done") {
            const r = ev.result as { durationMs: number } | undefined;
            setMeta((m) => ({ ...m, durationMs: r?.durationMs }));
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
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function applyAndReload() {
    // Server already persisted the revision. Refresh the route so the
    // main article view picks up the new source.
    router.refresh();
    // Reset local state so the panel collapses cleanly.
    setExpanded(false);
    setFeedback("");
    setMarkdown("");
    setStatus("idle");
    setMeta({});
  }

  if (!expanded) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-black/15 bg-atea-sand/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-atea-navy">{t("reviser.title")}</div>
            <div className="text-[11px] text-black/50">
              {t("reviser.description")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded bg-atea-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-atea-green/90"
          >
            {t("reviser.startRevision")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-atea-navy/20 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-atea-navy">{t("reviser.title")}</div>
        {status === "idle" && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-[11px] text-black/40 hover:text-atea-red"
          >
            {t("reviser.close")}
          </button>
        )}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-black/60">
            {t("reviser.feedbackLabel")}
          </span>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={status === "streaming"}
            placeholder={t("reviser.feedbackPlaceholder")}
            className="min-h-[110px] w-full rounded border border-black/15 bg-white px-3 py-2 text-sm disabled:opacity-60"
            minLength={10}
            maxLength={5000}
            required
          />
          <div className="mt-1 text-[11px] text-black/40">
            {feedback.length}/5000 · {t("reviser.feedbackMin")}
          </div>
        </label>

        <div className="flex items-center gap-2">
          {status !== "done" && (
            <button
              type="submit"
              disabled={status === "streaming" || feedback.trim().length < 10}
              className="rounded bg-atea-red px-4 py-2 text-sm font-semibold text-white hover:bg-atea-red/90 disabled:opacity-50"
            >
              {status === "streaming" ? t("reviser.revising") : t("reviser.startRevision")}
            </button>
          )}
          {status === "streaming" && (
            <button
              type="button"
              onClick={cancel}
              className="rounded border border-black/15 bg-white px-4 py-2 text-sm text-black/70 hover:bg-atea-sand"
            >
              {t("common.cancel")}
            </button>
          )}
          {status === "done" && (
            <button
              type="button"
              onClick={applyAndReload}
              className="rounded bg-atea-green px-4 py-2 text-sm font-semibold text-white hover:bg-atea-green/90"
            >
              {t("reviser.useNewVersion")}
            </button>
          )}
          {meta.model && (
            <span className="ml-auto text-[11px] text-black/40">
              {meta.model} · {meta.promptVersion}
              {meta.durationMs && ` · ${(meta.durationMs / 1000).toFixed(1)}s`}
            </span>
          )}
        </div>
      </form>

      {errorMessage && (
        <div className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("common.errorPrefix")} {errorMessage}
        </div>
      )}

      {markdown && (
        <div className="mt-4 border-t border-black/10 pt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-black/50">
            {t("reviser.newVersionDraft")}
          </div>
          <div className="rounded border border-black/10 bg-atea-sand/40 p-4">
            <MarkdownView markdown={markdown} streaming={status === "streaming"} />
          </div>
          {status === "done" && (
            <div className="mt-3 rounded bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              {t("reviser.staleTranslations")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
