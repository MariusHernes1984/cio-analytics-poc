"use client";

import { useMemo } from "react";

/**
 * Extremely lightweight markdown-to-HTML renderer for the article viewer
 * and streaming panes. We intentionally do not depend on a heavy library
 * like react-markdown since the agents emit a constrained subset:
 * H1-H3, bold, italic, links, lists, blockquotes, code.
 *
 * This matches the subset documented in docs/PROMPT_GUIDE.md and tested
 * by the docx exporter. Anything outside the subset degrades gracefully
 * to raw text.
 */
export function MarkdownView({
  markdown,
  streaming = false,
}: {
  markdown: string;
  streaming?: boolean;
}) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);
  return (
    <div
      className={`prose-cio ${streaming ? "streaming-cursor" : ""}`}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  // bold **x**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic *x*
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // inline code `x`
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  // links [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, url: string) =>
      `<a href="${safeHref(url)}" target="_blank" rel="noreferrer">${label}</a>`,
  );
  return out;
}

function safeHref(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|#)/i.test(trimmed)) return trimmed;
  return "#";
}

function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let inBlockquote = false;
  let paraBuffer: string[] = [];

  const flushPara = () => {
    if (paraBuffer.length) {
      out.push(`<p>${renderInline(paraBuffer.join(" "))}</p>`);
      paraBuffer = [];
    }
  };
  const closeList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };
  const closeBlockquote = () => {
    if (inBlockquote) {
      out.push("</blockquote>");
      inBlockquote = false;
    }
  };

  for (const line of lines) {
    if (line.trim() === "") {
      flushPara();
      closeList();
      closeBlockquote();
      continue;
    }

    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      flushPara();
      closeList();
      closeBlockquote();
      const level = h[1]!.length;
      out.push(`<h${level}>${renderInline(h[2]!)}</h${level}>`);
      continue;
    }

    const ul = /^[-*]\s+(.+)$/.exec(line);
    if (ul) {
      flushPara();
      closeBlockquote();
      if (inList !== "ul") {
        closeList();
        out.push("<ul>");
        inList = "ul";
      }
      out.push(`<li>${renderInline(ul[1]!)}</li>`);
      continue;
    }

    const ol = /^\d+\.\s+(.+)$/.exec(line);
    if (ol) {
      flushPara();
      closeBlockquote();
      if (inList !== "ol") {
        closeList();
        out.push("<ol>");
        inList = "ol";
      }
      out.push(`<li>${renderInline(ol[1]!)}</li>`);
      continue;
    }

    const bq = /^>\s?(.*)$/.exec(line);
    if (bq) {
      flushPara();
      closeList();
      if (!inBlockquote) {
        out.push("<blockquote>");
        inBlockquote = true;
      }
      out.push(`<p>${renderInline(bq[1]!)}</p>`);
      continue;
    }

    closeList();
    closeBlockquote();
    paraBuffer.push(line);
  }
  flushPara();
  closeList();
  closeBlockquote();
  return out.join("\n");
}
