import Link from "next/link";
import { getPromptStore } from "@/lib/prompts/PromptStore";
import { requireSession } from "@/lib/auth/requireSession";
import type { AgentId } from "@/lib/agents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENTS: Array<{
  id: AgentId;
  label: string;
  description: string;
  accent: string;
}> = [
  {
    id: "writer",
    label: "Writer",
    description:
      "Skriver nye norske CIO Analytics-artikler fra brief + researchmateriale. Default: Sonnet 4.6.",
    accent: "bg-atea-navy",
  },
  {
    id: "translator",
    label: "Translator",
    description:
      "Oversetter norske artikler til engelsk, svensk, dansk og finsk. Default: Haiku 4.5.",
    accent: "bg-atea-red",
  },
];

export default async function PromptsPage() {
  const session = await requireSession();
  if (!session.ok) {
    return <div className="p-10 text-sm text-red-700">Unauthorized.</div>;
  }

  const store = await getPromptStore();
  const cards = await Promise.all(
    AGENTS.map(async (agent) => {
      const current = await store.getCurrent(agent.id);
      const versions = await store.listVersions(agent.id);
      return { ...agent, current, versionCount: versions.length };
    }),
  );

  return (
    <div className="mx-auto max-w-5xl px-10 py-10">
      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">
          Prompts
        </div>
        <h1 className="mt-1 text-3xl font-bold text-atea-navy">Rediger agenter</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          Endre system-prompts, modell-valg og parametere live. Endringer versjoneres — du kan
          rulle tilbake med ett klikk. Test-panen kjører et utkast mot Foundry uten å lagre noe.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm"
          >
            <div className={`${card.accent} px-5 py-4 text-white`}>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Agent
              </div>
              <div className="mt-0.5 text-xl font-bold">{card.label}</div>
            </div>
            <div className="p-5">
              <p className="text-sm text-black/60">{card.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <dt className="text-black/40">Gjeldende versjon</dt>
                  <dd className="font-mono font-semibold text-atea-navy">
                    {card.current.version}
                  </dd>
                </div>
                <div>
                  <dt className="text-black/40">Modell</dt>
                  <dd className="font-mono text-atea-navy">{card.current.draft.model}</dd>
                </div>
                <div>
                  <dt className="text-black/40">Temperatur</dt>
                  <dd className="font-mono text-atea-navy">{card.current.draft.temperature}</dd>
                </div>
                <div>
                  <dt className="text-black/40">Totale versjoner</dt>
                  <dd className="font-mono text-atea-navy">{card.versionCount}</dd>
                </div>
              </dl>
              <div className="mt-5 flex gap-2">
                <Link
                  href={`/prompts/${card.id}`}
                  className="rounded bg-atea-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-atea-navy/90"
                >
                  Rediger
                </Link>
                <Link
                  href={`/prompts/${card.id}/history`}
                  className="rounded border border-black/15 px-3 py-1.5 text-xs font-medium text-atea-navy hover:bg-atea-sand"
                >
                  Historikk
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
