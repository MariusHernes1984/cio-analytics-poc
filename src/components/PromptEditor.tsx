"use client";

import dynamic from "next/dynamic";

/**
 * Thin wrapper around @monaco-editor/react. Isolated here so swapping to a
 * plain <textarea> later is a one-file change — the editor page never imports
 * Monaco directly.
 *
 * Why this shape:
 * - Monaco is heavy (~2MB) and only needed on one page, so we load it via
 *   `next/dynamic` with SSR off.
 * - The prop surface is deliberately narrow: value / onChange / height / language.
 *   Matches a textarea closely. If the editor team prefers a textarea, replace
 *   the body of PromptEditor with a <textarea> that forwards the same props.
 */

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded border border-black/10 bg-white text-sm text-black/40">
        Laster editor…
      </div>
    ),
  },
);

export interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
  language?: string;
  readOnly?: boolean;
}

export function PromptEditor({
  value,
  onChange,
  height = "100%",
  language = "markdown",
  readOnly = false,
}: PromptEditorProps) {
  return (
    <div className="h-full overflow-hidden rounded border border-black/15 bg-white">
      <MonacoEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        language={language}
        height={height}
        theme="vs"
        options={{
          minimap: { enabled: false },
          lineNumbers: "on",
          wordWrap: "on",
          fontSize: 13,
          fontFamily: "Consolas, 'Courier New', monospace",
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          readOnly,
          tabSize: 2,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
