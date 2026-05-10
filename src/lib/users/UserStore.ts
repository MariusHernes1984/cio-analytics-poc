/**
 * User storage for role-based access control.
 * Same singleton-factory pattern as PromptStore / ArticleStore / SourceStore.
 */

export interface StoredUser {
  id: string;
  username: string;
  role: "admin" | "user";
  passwordHash: string;
  createdAt: string;
  createdBy: string; // username of the admin who created this user
}

/** Safe subset — never expose passwordHash to clients */
export interface UserInfo {
  id: string;
  username: string;
  role: "admin" | "user";
  createdAt: string;
  createdBy: string;
}

export function toUserInfo(user: StoredUser): UserInfo {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    createdBy: user.createdBy,
  };
}

export interface UserStore {
  list(): Promise<StoredUser[]>;
  getByUsername(username: string): Promise<StoredUser | null>;
  add(user: StoredUser): Promise<void>;
  remove(id: string): Promise<void>;
  count(): Promise<number>;
}

let cached: UserStore | null = null;

export async function getUserStore(): Promise<UserStore> {
  if (cached) return cached;
  const { getEnv } = await import("@/lib/env");
  const env = getEnv();
  if (env.STORAGE_MODE === "azure") {
    const { BlobUserStore } = await import("@/lib/users/BlobUserStore");
    cached = new BlobUserStore();
  } else {
    const { LocalUserStore } = await import("@/lib/users/LocalUserStore");
    cached = new LocalUserStore();
  }
  return cached;
}
