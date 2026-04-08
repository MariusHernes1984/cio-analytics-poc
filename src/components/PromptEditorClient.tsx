"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PromptEditor } from "@/components/PromptEditor";
import { MarkdownView } from "@/components/MarkdownView";
import { streamSse } from "@/lib/sseClient";
import type { AgentId } from "@/lib/agents/types";
import type { PromptVersion, PromptVersionMeta } from "@/lib/prompts/PromptStore";

const AVAILABLE_MODELS = [
  { id: "claude-opus-4-6", label: "Opus 4.6 (maks kvalitet)" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6 (balansert)" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5 (rask/billig)" },
];

type SaveState = "idle" | "saving" | "saved" | "error";
type TestState = "idle" | "streaming" | "done" | "error";

export function PromptEditorClient({
  agent,
  initialCurrent,
  initialVersions,
}: {
  agent: AgentId;
  initialCurrent: PromptVersion;
  initialVersions: PromptVersionMeta[];
}) {
  const router = useRouter();

  // Editor state
  const [systemPrompt, setSystemPrompt] = useState(initialCurrent.draft.systemPrompt);
  const [model, setModel] = useState(initialCurrent.draft.model);
  const [maxTokens, setMaxTokens] = useState(initialCurrent.draft.maxTokens);
  const [temperature, setTemperature] = useState(initialCurrent.draft.temperature);

  // Save state
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [author, setAuthor] = useState("");
  const [changeNote, setChangeNote] = useState("");

  // Test pane state
  const [testUserMessage, setTestUserMessage] = useState(getExampleUserMessage(agent));
  const [testState, setTestState] = useState<TestState>("idle");
  const [testOutput, setTestOutput] = useState("");
  const [testMeta, setTestMeta] = useState<{
    inputTokens?: number;
    outputTokens?: number;
  }>({});
  const [testError, setTestError] = useState<string | null>(null);

  const hasUnsavedChanges =
    systemPrompt !== initialCurrent.draft.systemPrompt ||
    model !== initialCurrent.draft.model ||
    maxTokens !== initialCurrent.draft.maxTokens ||
    temperature !== initialCurrent.draft.temperature;

  function openSaveDialog() {
    if (!hasUnsavedChanges) return;
    setShowSaveDialog(true);
  }

  async function doSave() {
    if (!author.trim() || !changeNote.trim()) {
      alert("Forfatter og change-note er påkrevd.");
      return;
    }
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch(`/api/prompts/${agent}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          model,
          maxTokens,
          temperature,
          variables: initialCurrent.draft.variables,
          author: author.trim(),
          changeNote: changeNote.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ukjent feil" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      setSaveState("saved");
      setShowSaveDialog(false);
      setChangeNote("");
      router.refresh();
    } catch (err) {
      setSaveState("error");
      setSaveError((err as Error).message);
    }
  }

  async function runTest() {
    setTestState("streaming");
    setTestOutput("");
    setTestMeta({});
    setTestError(null);

    try {
      await streamSse({
        url: `/api/prompts/${agent}/test`,
        body: {
          systemPrompt,
          userMessage: testUserMessage,
          model,
          maxTokens,
          temperature,
        },
        onEvent(ev) {
          if (ev.type === "delta") {
            setTestOutput((prev) => prev + ev.text);
          } else if (ev.type === "done") {
            setTestMeta({
              inputTokens: ev.inputTokens,
              outputTokens: ev.outputTokens,
            });
            setTestState("done");
          } else if (ev.type === "error") {
            setTestError(ev.message);
            setTestState("error");
          }
        },
      });
    } catch (err) {
      setTestError((err as Error).message);
      setTestState("error");
    }
  }

  function revertChanges() {
    setSystemPrompt(initialCurrent.draft.systemPrompt);
    setModel(initialCurrent.draft.model);
    setMaxTokens(initialCurrent.draft.maxTokens);
    setTemperature(initialCurrent.draft.temperature);
  }

  return (
    <>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">
            {agent === "writer" ? "Writer-agent" : "Translator-agent"}
          </div>
          <h1 className="mt-1 text-3xl font-bold text-atea-navy">Prompt-editor</h1>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-black/50">
            <span>
              Gjeldende: <strong className="font-mono">{initialCurrent.version}</strong>
            </span>
            <span>·</span>
            <span>{initialVersions.length} versjoner</span>
            <span>·</span>
            <Link
              href={`/prompts/${agent}/history`}
              className="text-atea-navy underline hover:text-atea-red"
            >
              Historikk
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <>
              <span className="text-[11px] text-atea-red">● Ulagrede endringer</span>
              <button
                onClick={revertChanges}
                className="rounded border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:bg-atea-sand"
              >
                Forkast
              </button>
              <button
                onClick={openSaveDialog}
                className="rounded bg-atea-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-atea-navy/90"
              >
                Lagre ny versjon
              </button>
            </>
          )}
          {!hasUnsavedChanges && saveState === "saved" && (
            <span className="text-[11px] text-green-700">✓ Lagret</span>
          )}
        </div>
      </header>

      {/* Model & params row */}
      <div className="mb-4 flex flex-wrap gap-4 rounded-lg border border-black/10 bg-white p-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60">
            Modell
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1 rounded border border-black/15 bg-white px-3 py-1.5 text-sm"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60">
            Max tokens
          </label>
          <input
            type="number"
            min={256}
            max={16000}
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value || "4000", 10))}
            className="mt-1 w-28 rounded border border-black/15 bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60">
            Temperatur
          </label>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value || "0.7"))}
            className="mt-1 w-28 rounded border border-black/15 bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <div className="ml-auto">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60">
            Variabler
          </label>
          <div className="mt-1 flex flex-wrap gap-1">
            {initialCurrent.draft.variables.map((v) => (
              <code
                key={v}
                className="rounded bg-atea-navy/5 px-1.5 py-0.5 font-mono text-[11px] text-atea-navy"
              >
                {`{{${v}}}`}
              </code>
            ))}
          </div>
        </div>
      </div>

      {/* Editor + test pane */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: prompt editor */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/60">
            System-prompt
          </h2>
          <div className="h-[640px]">
            <PromptEditor value={systemPrompt} onChange={setSystemPrompt} />
          </div>
          <div className="mt-2 text-[11px] text-black/40">
            {systemPrompt.length.toLocaleString("nb-NO")} tegn ·{" "}
            {systemPrompt.split(/\s+/).length.toLocaleString("nb-NO")} ord
          </div>
        </section>

        {/* Right: test pane */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black/60">
              Test-pane
            </h2>
            <span className="text-[11px] text-black/40">Lagrer ingenting</span>
          </div>
          <div className="flex h-[640px] flex-col gap-3">
            <div>
              <label className="block text-[11px] text-black/60">Test user-message</label>
              <textarea
                value={testUserMessage}
                onChange={(e) => setTestUserMessage(e.target.value)}
                className="mt-1 h-32 w-full rounded border border-black/15 bg-white p-2 font-mono text-xs"
              />
            </div>
            <button
              onClick={runTest}
              disabled={testState === "streaming"}
              className="rounded bg-atea-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-atea-red/90 disabled:opacity-50"
            >
              {testState === "streaming" ? "Kjører test…" : "Kjør test (uten å lagre)"}
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto rounded border border-black/10 bg-white p-4">
              {testState === "idle" && !testOutput && (
                <div className="text-xs text-black/30">
                  Klikk «Kjør test» for å sende draftet til Foundry og se output.
                </div>
              )}
              {testError && (
                <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {testError}
                </div>
              )}
              {testOutput && (
                <MarkdownView
                  markdown={testOutput}
                  streaming={testState === "streaming"}
                />
              )}
            </div>
            {testState === "done" && (
              <div className="text-[11px] text-black/50">
                {testMeta.inputTokens} → {testMeta.outputTokens} tokens
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-atea-navy">Lagre ny versjon</h3>
            <p className="mt-1 text-xs text-black/60">
              Versjoner er immutable. Denne lagringen blir ny «current».
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-black/60">
                  Forfatter
                </span>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Navn eller initialer"
                  className="mt-1 w-full rounded border border-black/15 bg-white px-3 py-2 text-sm"
                  maxLength={120}
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-black/60">
                  Change-note
                </span>
                <textarea
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="Hva endret du, og hvorfor?"
                  className="mt-1 min-h-[80px] w-full rounded border border-black/15 bg-white px-3 py-2 text-sm"
                  maxLength={500}
                />
              </label>
              {saveError && (
                <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                disabled={saveState === "saving"}
                className="rounded border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:bg-atea-sand"
              >
                Avbryt
              </button>
              <button
                onClick={doSave}
                disabled={saveState === "saving"}
                className="rounded bg-atea-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-atea-navy/90 disabled:opacity-50"
              >
                {saveState === "saving" ? "Lagrer…" : "Lagre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getExampleUserMessage(agent: AgentId): string {
  if (agent === "writer") {
    return `<topic>
Hvordan norske CIO-er prioriterer AI-investeringer i 2026
</topic>

<brief>
Vi vil skrive en artikkel som viser hvordan toppene i norske virksomheter ser forskjell på hype og reell verdi fra generativ AI. Vinkel: de som har lykkes har et mønster — de kutter pilotfasen kort og flytter budsjett raskt mot produksjon. Målgruppen er CIO-er som står fast i pilot-helvete.
</brief>

<targetLengthWords>750</targetLengthWords>`;
  }
  return `<sourceMarkdown>
# Fra pilot til produksjon: Slik kutter de mest modne CIO-ene gjennom AI-støyen

For to år siden handlet alt om eksperimentering. I 2026 er spørsmålet blitt et annet: Hvem klarer å flytte pilotene sine over i ordinær drift?

En gjennomgang av CIO Analytics-surveyen viser at 43 prosent av norske virksomheter nå har minst ett AI-bruksområde i produksjon. Det er dobbelt så mange som i 2024.
</sourceMarkdown>

<targetLanguage>en</targetLanguage>`;
}
