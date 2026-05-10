"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || "Innlogging feilet");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Nettverksfeil. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-atea-navy">Logg inn</h2>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-black/50">
          Brukernavn
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded border border-black/15 px-3 py-2 text-sm focus:border-atea-green focus:outline-none"
          autoComplete="username"
          autoFocus
          required
        />
      </div>

      <div className="mb-6">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-black/50">
          Passord
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-black/15 px-3 py-2 text-sm focus:border-atea-green focus:outline-none"
          autoComplete="current-password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading || !username || !password}
        className="w-full rounded bg-atea-green px-4 py-2.5 text-sm font-medium text-white transition hover:bg-atea-green/90 disabled:opacity-50"
      >
        {loading ? "Logger inn…" : "Logg inn"}
      </button>
    </form>
  );
}
