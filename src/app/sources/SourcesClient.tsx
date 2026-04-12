"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface ReferenceSource {
  id: string;
  name: string;
  domain: string;
  description?: string;
  addedAt: string;
}

export function SourcesClient() {
  const { t } = useTranslation();
  const [sources, setSources] = useState<ReferenceSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/sources");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSources(data as ReferenceSource[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSources(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !domain.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), domain: domain.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setName("");
      setDomain("");
      setDescription("");
      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch("/api/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchSources();
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

      {/* Add form */}
      <form onSubmit={handleAdd} className="rounded-lg border border-black/10 bg-white p-6">
        <div className="mb-4 text-sm font-semibold text-atea-navy">{t("sources.addTitle")}</div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-black/50">
              {t("sources.nameLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("sources.namePlaceholder")}
              className="w-full rounded border border-black/15 px-3 py-2 text-sm focus:border-atea-green focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-black/50">
              {t("sources.domainLabel")}
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder={t("sources.domainPlaceholder")}
              className="w-full rounded border border-black/15 px-3 py-2 text-sm focus:border-atea-green focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-black/50">
              {t("sources.descriptionLabel")}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("sources.descriptionPlaceholder")}
              className="w-full rounded border border-black/15 px-3 py-2 text-sm focus:border-atea-green focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="submit"
            disabled={saving || !name.trim() || !domain.trim()}
            className="rounded bg-atea-green px-4 py-2 text-sm font-medium text-white transition hover:bg-atea-green/90 disabled:opacity-50"
          >
            {saving ? t("common.saving") : t("sources.addButton")}
          </button>
        </div>
      </form>

      {/* Sources list */}
      <div className="rounded-lg border border-black/10 bg-white">
        <div className="border-b border-black/10 px-5 py-3">
          <div className="text-sm font-semibold text-atea-navy">
            {t("sources.listTitle")} ({sources.length})
          </div>
        </div>
        {sources.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-black/40">
            {t("sources.empty")}
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-atea-navy">{source.name}</span>
                    <span className="rounded bg-black/5 px-2 py-0.5 text-xs font-mono text-black/50">
                      {source.domain}
                    </span>
                  </div>
                  {source.description && (
                    <div className="mt-0.5 text-xs text-black/40">{source.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-black/30">
                    {new Date(source.addedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleRemove(source.id)}
                    className="rounded px-2 py-1 text-xs text-red-500 transition hover:bg-red-50 hover:text-red-700"
                  >
                    {t("common.remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
