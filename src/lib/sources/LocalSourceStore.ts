import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ReferenceSource, SourceStore } from "./SourceStore";

const FILE_NAME = "sources.json";

/**
 * Local filesystem implementation — stores all sources in a single JSON file.
 */
export class LocalSourceStore implements SourceStore {
  private readonly filePath: string;

  constructor(rootDir = path.join(process.cwd(), ".local-sources")) {
    this.filePath = path.join(rootDir, FILE_NAME);
  }

  async list(): Promise<ReferenceSource[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(raw) as ReferenceSource[];
    } catch {
      return [];
    }
  }

  async add(source: ReferenceSource): Promise<void> {
    const sources = await this.list();
    sources.push(source);
    await this.write(sources);
  }

  async remove(id: string): Promise<void> {
    const sources = await this.list();
    const filtered = sources.filter((s) => s.id !== id);
    await this.write(filtered);
  }

  private async write(sources: ReferenceSource[]): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(sources, null, 2), "utf-8");
  }
}
