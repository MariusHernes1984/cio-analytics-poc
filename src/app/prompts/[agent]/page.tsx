import { notFound } from "next/navigation";
import { getPromptStore } from "@/lib/prompts/PromptStore";
import { PromptEditorClient } from "@/components/PromptEditorClient";
import { requireSession } from "@/lib/auth/requireSession";
import type { AgentId } from "@/lib/agents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_AGENTS: AgentId[] = ["writer", "translator"];

export default async function PromptAgentPage({
  params,
}: {
  params: Promise<{ agent: string }>;
}) {
  const session = await requireSession();
  if (!session.ok || session.user?.role !== "admin") {
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

  return (
    <div className="mx-auto max-w-7xl px-10 py-10">
      <PromptEditorClient
        agent={agent}
        initialCurrent={current}
        initialVersions={versions}
      />
    </div>
  );
}
