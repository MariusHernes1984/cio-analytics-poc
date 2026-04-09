"use client";

import { useState } from "react";
import Link from "next/link";
import { MarkdownView } from "@/components/MarkdownView";
import { ArticleReviser } from "@/components/ArticleReviser";
import { TARGET_LANGUAGE_LABELS, type TargetLanguage } from "@/lib/agents/types";
import type { StoredArticle } from "@/lib/articles/ArticleStore";

type TabKey = "no" | TargetLanguage;

/**
 * Client-side article viewer. Tabs for Norwegian + each existing translation,
 * plus export buttons (.md / .docx) and a link to translate into new languages.
 */
export function ArticleViewer({ article }: { article: StoredArticle }) {
  const translatedLanguages = Object.keys(article.translations) as TargetLanguage[];
  const [tab, setTab] = useState<TabKey>("no");
  const [isExporting, setIsExporting] = useState<false | "md" | "docx">(false);

  const activeResult = tab === "no" ? article.source : article.translations[tab]!;
  const activeMarkdown = activeResult.markdown;
  const activeTitle = tab === "no" ? article.title : extractTitle(activeMarkdown, article.title);

  async function exportAs(kind: "md" | "docx") {
    setIsExporting(kind);
    try {
      const res = await fetch(`/api/export/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: activeMarkdown, title: activeTitle }),
      });
      if (!res.ok) {
        const err = await res.text();
        alert(`Eksport feilet: ${err}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(activeTitle)}.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-10 py-10">
      <div className="mb-4">
        <Link href="/articles" className="text-xs text-atea-navy underline hover:text-atea-red">
          ← Alle artikler
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-atea-navy">{article.title}</h1>
        <div className="mt-2 text-[11px] text-black/50">
          Opprettet {new Date(article.createdAt).toLocaleString("nb-NO")} · modell{" "}
          {article.source.model} · prompt {article.source.promptVersion} ·{" "}
          {article.source.inputTokens} → {article.source.outputTokens} tokens
        </div>
      </header>

      <div className="mb-4 flex items-center justify-between gap-4 border-b border-black/10">
        <div className="flex">
          <TabButton active={tab === "no"} onClick={() => setTab("no")}>
            Norsk (kilde)
          </TabButton>
          {translatedLanguages.map((lang) => (
            <TabButton key={lang} active={tab === lang} onClick={() => setTab(lang)}>
              {TARGET_LANGUAGE_LABELS[lang]}
            </TabButton>
          ))}
        </div>
        <div className="flex gap-2 pb-2">
          <button
            onClick={() => exportAs("md")}
            disabled={isExporting !== false}
            className="rounded border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-atea-navy hover:bg-atea-sand disabled:opacity-50"
          >
            {isExporting === "md" ? "…" : "Last ned .md"}
          </button>
          <button
            onClick={() => exportAs("docx")}
            disabled={isExporting !== false}
            className="rounded bg-atea-green px-3 py-1.5 text-xs font-medium text-white hover:bg-atea-green/90 disabled:opacity-50"
          >
            {isExporting === "docx" ? "…" : "Last ned .docx"}
          </button>
        </div>
      </div>

      <MissingLanguageCallout
        articleId={article.id}
        existing={["no", ...translatedLanguages] as TabKey[]}
      />

      <article className="mt-6 rounded-lg border border-black/10 bg-white p-8">
        <MarkdownView markdown={activeMarkdown} />
      </article>

      <footer className="mt-4 text-[11px] text-black/40">
        {tab !== "no" && (
          <>
            Oversatt: {new Date(activeResult.createdAt).toLocaleString("nb-NO")} ·{" "}
            {activeResult.model} · prompt {activeResult.promptVersion} ·{" "}
            {activeResult.inputTokens} → {activeResult.outputTokens} tokens
          </>
        )}
        {tab === "no" && article.revisions && article.revisions.length > 0 && (
          <>Revisjon #{article.revisions.length + 1} · oppdatert {new Date(article.updatedAt).toLocaleString("nb-NO")}</>
        )}
      </footer>

      {tab === "no" && <ArticleReviser articleId={article.id} />}
    </div>
  );
}

function TabButton({
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
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-atea-red text-atea-navy"
          : "border-transparent text-black/50 hover:text-atea-navy"
      }`}
    >
      {children}
    </button>
  );
}

function MissingLanguageCallout({
  articleId,
  existing,
}: {
  articleId: string;
  existing: TabKey[];
}) {
  const all: TargetLanguage[] = ["en", "sv", "da", "fi"];
  const missing = all.filter((l) => !existing.includes(l));
  if (missing.length === 0) return null;
  return (
    <div className="mt-4 flex items-center justify-between rounded-md bg-atea-navy/5 px-4 py-2 text-xs">
      <span className="text-black/60">
        Mangler oversettelse for:{" "}
        <strong className="text-atea-navy">
          {missing.map((l) => TARGET_LANGUAGE_LABELS[l]).join(", ")}
        </strong>
      </span>
      <Link
        href={`/translate?articleId=${articleId}`}
        className="font-medium text-atea-navy underline hover:text-atea-red"
      >
        Oversett →
      </Link>
    </div>
  );
}

function extractTitle(markdown: string, fallback: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m?.[1]?.trim() || fallback;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
