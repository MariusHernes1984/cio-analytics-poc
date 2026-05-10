import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { StoredUser, UserStore } from "./UserStore";

const FILE_NAME = "users.json";

export class LocalUserStore implements UserStore {
  private readonly filePath: string;

  constructor(rootDir = path.join(process.cwd(), ".local-users")) {
    this.filePath = path.join(rootDir, FILE_NAME);
  }

  async list(): Promise<StoredUser[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(raw) as StoredUser[];
    } catch {
      return [];
    }
  }

  async getByUsername(username: string): Promise<StoredUser | null> {
    const users = await this.list();
    return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
  }

  async add(user: StoredUser): Promise<void> {
    const users = await this.list();
    users.push(user);
    await this.write(users);
  }

  async remove(id: string): Promise<void> {
    const users = await this.list();
    await this.write(users.filter((u) => u.id !== id));
  }

  async count(): Promise<number> {
    return (await this.list()).length;
  }

  private async write(users: StoredUser[]): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(users, null, 2), "utf-8");
  }
}
