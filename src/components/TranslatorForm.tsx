"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MarkdownView } from "@/components/MarkdownView";
import { streamSse } from "@/lib/sseClient";
import {
  TARGET_LANGUAGE_LABELS,
  type TargetLanguage,
  type GlossaryEntry,
} from "@/lib/agents/types";
import type { ArticleListItem, StoredArticle } from "@/lib/articles/ArticleStore";

type Mode = "saved" | "paste";
type LangStatus = "idle" | "streaming" | "done" | "error";

interface LangState {
  status: LangStatus;
  markdown: string;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  model?: string;
}

const ALL_LANGS: TargetLanguage[] = ["en", "sv", "da", "fi"];

const emptyLangState = (): LangState => ({ status: "idle", markdown: "" });

export function TranslatorForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedArticleId = searchParams.get("articleId");

  const [mode, setMode] = useState<Mode>(preselectedArticleId ? "saved" : "paste");
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    preselectedArticleId,
  );
  const [selectedArticle, setSelectedArticle] = useState<StoredArticle | null>(null);
  const [pastedMarkdown, setPastedMarkdown] = useState("");
  const [selectedLangs, setSelectedLangs] = useState<TargetLanguage[]>(["en"]);
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [runs, setRuns] = useState<Record<TargetLanguage, LangState>>({
    en: emptyLangState(),
    sv: emptyLangState(),
    da: emptyLangState(),
    fi: emptyLangState(),
  });
  const [isRunning, setIsRunning] = useState(false);
  const abortControllersRef = useRef<Map<TargetLanguage, AbortController>>(new Map());

  // Load list of saved articles for the "saved" mode dropdown
  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.json())
      .then((d) => setArticles(d.items ?? []))
      .catch(() => setArticles([]));
  }, []);

  // When an article is selected, fetch its full body
  useEffect(() => {
    if (!selectedArticleId) {
      setSelectedArticle(null);
      return;
    }
    fetch(`/api/articles/${selectedArticleId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSelectedArticle(d as StoredArticle | null))
      .catch(() => setSelectedArticle(null));
  }, [selectedArticleId]);

  const sourceMarkdown =
    mode === "saved" ? selectedArticle?.source.markdown ?? "" : pastedMarkdown;

  function toggleLang(lang: TargetLanguage) {
    setSelectedLangs((curr) =>
      curr.includes(lang) ? curr.filter((l) => l !== lang) : [...curr, lang],
    );
  }

  function addGlossary() {
    setGlossary((g) => [...g, { source: "", target: "" }]);
  }
  function updateGlossary(idx: number, patch: Partial<GlossaryEntry>) {
    setGlossary((g) => g.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function removeGlossary(idx: number) {
    setGlossary((g) => g.filter((_, i) => i !== idx));
  }

  async function runOne(lang: TargetLanguage) {
    const controller = new AbortController();
    abortControllersRef.current.set(lang, controller);

    setRuns((prev) => ({ ...prev, [lang]: { status: "streaming", markdown: "" } }));

    try {
      await streamSse({
        url: "/api/translate",
        body: {
          sourceMarkdown,
          targetLanguage: lang,
          glossary:
            glossary.filter((e) => e.source && e.target).length > 0
              ? glossary.filter((e) => e.source && e.target)
              : undefined,
          attachToArticleId:
            mode === "saved" && selectedArticleId ? selectedArticleId : undefined,
        },
        signal: controller.signal,
        onEvent(ev) {
          if (ev.type === "start") {
            setRuns((prev) => ({
              ...prev,
              [lang]: { ...prev[lang], model: ev.model },
            }));
          } else if (ev.type === "delta") {
            setRuns((prev) => ({
              ...prev,
              [lang]: { ...prev[lang], markdown: prev[lang].markdown + ev.text },
            }));
          } else if (ev.type === "done") {
            const r = ev.result as
              | { inputTokens: number; outputTokens: number; durationMs: number }
              | undefined;
            setRuns((prev) => ({
              ...prev,
              [lang]: {
                ...prev[lang],
                status: "done",
                inputTokens: r?.inputTokens,
                outputTokens: r?.outputTokens,
                durationMs: r?.durationMs,
              },
            }));
          } else if (ev.type === "error") {
            setRuns((prev) => ({
              ...prev,
              [lang]: { ...prev[lang], status: "error", error: ev.message },
            }));
          }
        },
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setRuns((prev) => ({ ...prev, [lang]: emptyLangState() }));
        return;
      }
      setRuns((prev) => ({
        ...prev,
        [lang]: { ...prev[lang], status: "error", error: (err as Error).message },
      }));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isRunning) return;
    if (!sourceMarkdown || sourceMarkdown.length < 10) {
      alert("Velg eller lim inn en artikkel først.");
      return;
    }
    if (selectedLangs.length === 0) {
      alert("Velg minst ett målspråk.");
      return;
    }

    setIsRunning(true);
    try {
      // Run all selected langs in parallel
      await Promise.all(selectedLangs.map((lang) => runOne(lang)));
      if (mode === "saved" && selectedArticleId) {
        // Refresh so the article detail view sees the new translations
        router.refresh();
      }
    } finally {
      setIsRunning(false);
    }
  }

  function cancelAll() {
    abortControllersRef.current.forEach((ctrl) => ctrl.abort());
    abortControllersRef.current.clear();
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {/* Mode selector */}
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="mb-3 flex gap-2">
          <ModeButton active={mode === "saved"} onClick={() => setMode("saved")}>
            Velg fra lagret
          </ModeButton>
          <ModeButton active={mode === "paste"} onClick={() => setMode("paste")}>
            Lim inn markdown
          </ModeButton>
        </div>

        {mode === "saved" ? (
          <div className="space-y-3">
            <select
              value={selectedArticleId ?? ""}
              onChange={(e) => setSelectedArticleId(e.target.value || null)}
              className="w-full rounded border border-black/15 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Velg artikkel —</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                  {a.languages.length > 0 && ` (${a.languages.join(", ")})`}
                </option>
              ))}
            </select>
            {selectedArticle && (
              <div className="rounded bg-atea-sand p-3 text-xs text-black/60">
                <div className="font-semibold text-atea-navy">{selectedArticle.title}</div>
                <div className="mt-0.5 text-[11px]">
                  {selectedArticle.source.markdown.length.toLocaleString("nb-NO")} tegn ·{" "}
                  {selectedArticle.source.model} · prompt {selectedArticle.source.promptVersion}
                </div>
                {Object.keys(selectedArticle.translations).length > 0 && (
                  <div className="mt-1 text-[11px]">
                    Allerede oversatt:{" "}
                    <strong>
                      {Object.keys(selectedArticle.translations)
                        .map((l) => TARGET_LANGUAGE_LABELS[l as TargetLanguage])
                        .join(", ")}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={pastedMarkdown}
            onChange={(e) => setPastedMarkdown(e.target.value)}
            placeholder="Lim inn norsk markdown her…"
            className="min-h-[200px] w-full rounded border border-black/15 bg-white px-3 py-2 font-mono text-xs"
          />
        )}
      </div>

      {/* Target languages */}
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-black/60">
          Målspråk
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_LANGS.map((lang) => (
            <label
              key={lang}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                selectedLangs.includes(lang)
                  ? "border-atea-navy bg-atea-navy text-white"
                  : "border-black/15 bg-white text-black/70 hover:bg-atea-sand"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedLangs.includes(lang)}
                onChange={() => toggleLang(lang)}
                className="sr-only"
              />
              {TARGET_LANGUAGE_LABELS[lang]}
            </label>
          ))}
        </div>
      </div>

      {/* Glossary */}
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-black/60">
            Glossar (valgfritt)
          </div>
          <button
            type="button"
            onClick={addGlossary}
            className="rounded border border-black/15 px-2 py-1 text-[11px] font-medium text-atea-navy hover:bg-atea-sand"
          >
            + Ny term
          </button>
        </div>
        {glossary.length === 0 && (
          <div className="text-[11px] text-black/40">
            Legg til Atea-spesifikke termer som ikke skal oversettes, eller termer med fast
            oversettelse.
          </div>
        )}
        {glossary.map((entry, idx) => (
          <div key={idx} className="mb-2 flex gap-2">
            <input
              type="text"
              placeholder="Norsk kildeterm"
              value={entry.source}
              onChange={(e) => updateGlossary(idx, { source: e.target.value })}
              className="flex-1 rounded border border-black/15 bg-white px-2 py-1 text-xs"
            />
            <input
              type="text"
              placeholder="Oversettelse"
              value={entry.target}
              onChange={(e) => updateGlossary(idx, { target: e.target.value })}
              className="flex-1 rounded border border-black/15 bg-white px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={() => removeGlossary(idx)}
              className="text-[11px] text-black/40 hover:text-atea-red"
            >
              Fjern
            </button>
          </div>
        ))}
      </div>

      {/* Run button */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isRunning || selectedLangs.length === 0}
          className="rounded bg-atea-navy px-5 py-2 text-sm font-semibold text-white hover:bg-atea-navy/90 disabled:opacity-50"
        >
          {isRunning
            ? `Oversetter til ${selectedLangs.length} språk…`
            : `Oversett til ${selectedLangs.length} språk`}
        </button>
        {isRunning && (
          <button
            type="button"
            onClick={cancelAll}
            className="rounded border border-black/15 bg-white px-4 py-2 text-sm text-black/70 hover:bg-atea-sand"
          >
            Avbryt alle
          </button>
        )}
        {mode === "saved" && selectedArticleId && (
          <Link
            href={`/articles/${selectedArticleId}`}
            className="ml-auto text-xs text-atea-navy underline hover:text-atea-red"
          >
            Se artikkel →
          </Link>
        )}
      </div>

      {/* Output panes */}
      {selectedLangs.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {selectedLangs.map((lang) => (
            <LanguagePane key={lang} language={lang} state={runs[lang]} />
          ))}
        </div>
      )}
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-atea-navy bg-atea-navy text-white"
          : "border-black/15 bg-white text-black/70 hover:bg-atea-sand"
      }`}
    >
      {children}
    </button>
  );
}

function LanguagePane({ language, state }: { language: TargetLanguage; state: LangState }) {
  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/10 bg-atea-sand px-4 py-2">
        <div className="font-semibold text-atea-navy">{TARGET_LANGUAGE_LABELS[language]}</div>
        <StatusPill status={state.status} />
      </div>
      <div className="max-h-[500px] overflow-y-auto p-5">
        {state.status === "idle" && (
          <div className="text-xs text-black/30">Venter…</div>
        )}
        {state.error && (
          <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            Feil: {state.error}
          </div>
        )}
        {state.markdown && (
          <MarkdownView
            markdown={state.markdown}
            streaming={state.status === "streaming"}
          />
        )}
      </div>
      {state.status === "done" && (
        <div className="border-t border-black/10 px-4 py-2 text-[11px] text-black/50">
          {state.inputTokens} → {state.outputTokens} tokens ·{" "}
          {state.durationMs ? `${(state.durationMs / 1000).toFixed(1)}s` : "—"}
          {state.model && ` · ${state.model}`}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: LangStatus }) {
  if (status === "idle")
    return <span className="text-[10px] text-black/40">Venter</span>;
  const config: Record<Exclude<LangStatus, "idle">, { label: string; cls: string }> = {
    streaming: { label: "Streaming", cls: "bg-atea-navy/10 text-atea-navy" },
    done: { label: "Ferdig", cls: "bg-green-100 text-green-800" },
    error: { label: "Feil", cls: "bg-red-100 text-red-800" },
  };
  const c = config[status];
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${c.cls}`}>{c.label}</span>
  );
}
