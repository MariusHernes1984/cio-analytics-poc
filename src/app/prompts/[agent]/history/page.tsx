import Link from "next/link";
import { notFound } from "next/navigation";
import { getPromptStore } from "@/lib/prompts/PromptStore";
import { RollbackButton } from "@/components/RollbackButton";
import { requireSession } from "@/lib/auth/requireSession";
import type { AgentId } from "@/lib/agents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_AGENTS: AgentId[] = ["writer", "translator"];

export default async function PromptHistoryPage({
  params,
}: {
  params: Promise<{ agent: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) {
    return <div className="p-10 text-sm text-red-700">Unauthorized.</div>;
  }

  const { agent: agentRaw } = await params;
  if (!VALID_AGENTS.includes(agentRaw as AgentId)) notFound();
  const agent = agentRaw as AgentId;

  const store = await getPromptStore();
  const [current, versions] = await Promise.all([
    store.getCurrent(agent),
    store.listVersions(agent),
  ]);

  // Sort newest first
  const sorted = [...versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="mx-auto max-w-5xl px-10 py-10">
      <div className="mb-4">
        <Link
          href={`/prompts/${agent}`}
          className="text-xs text-atea-navy underline hover:text-atea-red"
        >
          ← Tilbake til editor
        </Link>
      </div>

      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">
          {agent === "writer" ? "Writer" : "Translator"} · Historikk
        </div>
        <h1 className="mt-1 text-3xl font-bold text-atea-navy">Versjoner</h1>
        <p className="mt-2 text-sm text-black/60">
          {versions.length} versjoner. Klikk «Sett som gjeldende» for å rulle tilbake — det
          påvirker kun fremtidige kjøringer, ikke eksisterende artikler.
        </p>
      </header>

      <ol className="space-y-3">
        {sorted.map((version) => {
          const isCurrent = version.version === current.version;
          return (
            <li
              key={version.version}
              className={`rounded-lg border bg-white p-5 ${
                isCurrent ? "border-atea-navy ring-1 ring-atea-navy" : "border-black/10"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-semibold text-atea-navy">
                      {version.version}
                    </code>
                    <span className="text-[11px] text-black/40">
                      {new Date(version.createdAt).toLocaleString("nb-NO")}
                    </span>
                    <span className="text-[11px] text-black/40">· {version.author}</span>
                  </div>
                  <p className="mt-2 text-sm text-black/80">{version.changeNote}</p>
                </div>
                <div className="shrink-0">
                  <RollbackButton
                    agent={agent}
                    version={version.version}
                    isCurrent={isCurrent}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
