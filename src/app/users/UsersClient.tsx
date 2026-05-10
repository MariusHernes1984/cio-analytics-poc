"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface UserInfo {
  id: string;
  username: string;
  role: "admin" | "user";
  createdAt: string;
  createdBy: string;
}

export function UsersClient() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers(await res.json() as UserInfo[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
      }
      setUsername("");
      setPassword("");
      setRole("user");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
      }
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading) return <div className="text-sm text-black/40">{t("common.loading")}</div>;

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("common.errorPrefix")} {error}
        </div>
      )}

      {/* Create user form */}
      <form onSubmit={handleCreate} className="rounded-lg border border-black/10 bg-white p-6">
        <div className="mb-4 text-sm font-semibold text-atea-navy">{t("users.createTitle")}</div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-black/50">
              {t("users.usernameLabel")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("users.usernamePlaceholder")}
              className="w-full rounded border border-black/15 px-3 py-2 text-sm focus:border-atea-green focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-black/50">
              {t("users.passwordLabel")}
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("users.passwordPlaceholder")}
              className="w-full rounded border border-black/15 px-3 py-2 text-sm font-mono focus:border-atea-green focus:outline-none"
              required
              minLength={4}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-black/50">
              {t("users.roleLabel")}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "user")}
              className="w-full rounded border border-black/15 px-3 py-2 text-sm focus:border-atea-green focus:outline-none"
            >
              <option value="user">{t("users.roleUser")}</option>
              <option value="admin">{t("users.roleAdmin")}</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving || !username.trim() || !password}
              className="rounded bg-atea-green px-4 py-2 text-sm font-medium text-white transition hover:bg-atea-green/90 disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("users.createButton")}
            </button>
          </div>
        </div>
      </form>

      {/* Users list */}
      <div className="rounded-lg border border-black/10 bg-white">
        <div className="border-b border-black/10 px-5 py-3">
          <div className="text-sm font-semibold text-atea-navy">
            {t("users.listTitle")} ({users.length})
          </div>
        </div>
        {users.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-black/40">
            {t("users.empty")}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-[11px] font-semibold uppercase tracking-wider text-black/50">
                <th className="px-5 py-2">{t("users.usernameLabel")}</th>
                <th className="px-5 py-2">{t("users.roleLabel")}</th>
                <th className="px-5 py-2">{t("users.createdByLabel")}</th>
                <th className="px-5 py-2">{t("users.createdAtLabel")}</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-2.5 font-medium text-atea-navy">{user.username}</td>
                  <td className="px-5 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      user.role === "admin"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-blue-50 text-blue-700"
                    }`}>
                      {user.role === "admin" ? t("users.roleAdmin") : t("users.roleUser")}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-black/50">{user.createdBy}</td>
                  <td className="px-5 py-2.5 text-black/50">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="rounded px-2 py-1 text-xs text-red-500 transition hover:bg-red-50 hover:text-red-700"
                    >
                      {t("common.remove")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
