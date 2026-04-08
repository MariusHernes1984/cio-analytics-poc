import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentId } from "@/lib/agents/types";
import { DEFAULT_PROMPTS, type PromptDraft } from "@/lib/prompts/defaults";
import {
  formatVersion,
  parseVersion,
  type PromptStore,
  type PromptVersion,
  type PromptVersionMeta,
  type SaveOptions,
} from "@/lib/prompts/PromptStore";

/**
 * Dev-only prompt store. Writes versioned JSON files under ./.local-prompts/.
 * Auto-seeds defaults as v0001 on first access so the app is immediately
 * functional in local development without running a seed script.
 *
 * DO NOT use in production — Azure App Service Linux does not have reliable
 * persistent local disk. Use BlobPromptStore instead.
 */
export class LocalPromptStore implements PromptStore {
  private readonly rootDir: string;

  constructor(rootDir = path.join(process.cwd(), ".local-prompts")) {
    this.rootDir = rootDir;
  }

  private agentDir(agent: AgentId): string {
    return path.join(this.rootDir, agent);
  }

  private versionFile(agent: AgentId, version: string): string {
    return path.join(this.agentDir(agent), `${version}.json`);
  }

  private currentFile(agent: AgentId): string {
    return path.join(this.agentDir(agent), "current.txt");
  }

  private async ensureSeeded(agent: AgentId): Promise<void> {
    const dir = this.agentDir(agent);
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.access(this.currentFile(agent));
      return; // already seeded
    } catch {
      // not seeded yet
    }
    const draft = DEFAULT_PROMPTS[agent];
    await this.saveNewVersion(agent, draft, {
      author: "system",
      changeNote: "Initial default prompt (auto-seeded)",
    });
  }

  async getCurrent(agent: AgentId): Promise<PromptVersion> {
    await this.ensureSeeded(agent);
    const current = (await fs.readFile(this.currentFile(agent), "utf8")).trim();
    return this.getVersion(agent, current);
  }

  async getVersion(agent: AgentId, version: string): Promise<PromptVersion> {
    const raw = await fs.readFile(this.versionFile(agent, version), "utf8");
    return JSON.parse(raw) as PromptVersion;
  }

  async listVersions(agent: AgentId): Promise<PromptVersionMeta[]> {
    await this.ensureSeeded(agent);
    const dir = this.agentDir(agent);
    const entries = await fs.readdir(dir);
    const versions: PromptVersionMeta[] = [];
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const version = entry.replace(/\.json$/, "");
      const raw = await fs.readFile(path.join(dir, entry), "utf8");
      const parsed = JSON.parse(raw) as PromptVersion;
      versions.push({
        agent: parsed.agent,
        version: parsed.version,
        createdAt: parsed.createdAt,
        author: parsed.author,
        changeNote: parsed.changeNote,
      });
    }
    versions.sort((a, b) => (a.version < b.version ? 1 : -1)); // newest first
    return versions;
  }

  async saveNewVersion(agent: AgentId, draft: PromptDraft, options: SaveOptions): Promise<PromptVersion> {
    await fs.mkdir(this.agentDir(agent), { recursive: true });
    const existing = await this.safeListVersionNumbers(agent);
    const nextNumber = existing.length === 0 ? 1 : Math.max(...existing) + 1;
    const version = formatVersion(nextNumber);
    const record: PromptVersion = {
      agent,
      version,
      draft,
      createdAt: new Date().toISOString(),
      author: options.author,
      changeNote: options.changeNote,
    };
    await fs.writeFile(this.versionFile(agent, version), JSON.stringify(record, null, 2), "utf8");
    await fs.writeFile(this.currentFile(agent), version, "utf8");
    return record;
  }

  async setCurrent(agent: AgentId, version: string): Promise<void> {
    // Verify the version exists before switching the pointer
    await this.getVersion(agent, version);
    await fs.writeFile(this.currentFile(agent), version, "utf8");
  }

  private async safeListVersionNumbers(agent: AgentId): Promise<number[]> {
    try {
      const entries = await fs.readdir(this.agentDir(agent));
      return entries
        .filter((e) => e.endsWith(".json"))
        .map((e) => parseVersion(e.replace(/\.json$/, "")))
        .filter((n) => !Number.isNaN(n));
    } catch {
      return [];
    }
  }
}
