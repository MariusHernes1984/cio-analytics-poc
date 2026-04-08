"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentId } from "@/lib/agents/types";

export function RollbackButton({
  agent,
  version,
  isCurrent,
}: {
  agent: AgentId;
  version: string;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const [isRolling, setIsRolling] = useState(false);

  async function rollback() {
    if (!confirm(`Sette ${version} som gjeldende versjon?`)) return;
    setIsRolling(true);
    try {
      const res = await fetch(`/api/prompts/${agent}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-current", version }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ukjent feil" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      alert(`Rollback feilet: ${(err as Error).message}`);
    } finally {
      setIsRolling(false);
    }
  }

  if (isCurrent) {
    return (
      <span className="rounded bg-atea-navy px-2 py-1 text-[10px] font-semibold uppercase text-white">
        Gjeldende
      </span>
    );
  }
  return (
    <button
      onClick={rollback}
      disabled={isRolling}
      className="rounded border border-black/15 bg-white px-3 py-1 text-[11px] text-atea-navy hover:bg-atea-sand disabled:opacity-50"
    >
      {isRolling ? "…" : "Sett som gjeldende"}
    </button>
  );
}
