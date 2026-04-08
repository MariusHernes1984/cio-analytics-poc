import Link from "next/link";
import { getArticleStore } from "@/lib/articles/ArticleStore";
import { TARGET_LANGUAGE_LABELS } from "@/lib/agents/types";
import { requireSession } from "@/lib/auth/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const session = await requireSession();
  if (!session.ok) {
    return <div className="p-10 text-sm text-red-700">Unauthorized.</div>;
  }

  const store = await getArticleStore();
  const items = await store.list();

  return (
    <div className="mx-auto max-w-5xl px-10 py-10">
      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">
          Artikler
        </div>
        <h1 className="mt-1 text-3xl font-bold text-atea-navy">Alle genererte artikler</h1>
        <p className="mt-2 text-sm text-black/60">
          {items.length} {items.length === 1 ? "artikkel" : "artikler"} lagret.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-black/15 bg-white/50 p-10 text-center text-sm text-black/50">
          Ingen artikler ennå.{" "}
          <Link href="/write" className="text-atea-navy underline hover:text-atea-red">
            Skriv den første
          </Link>
          .
        </div>
      ) : (
        <ul className="divide-y divide-black/10 overflow-hidden rounded-lg border border-black/10 bg-white">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/articles/${item.id}`}
                className="block px-5 py-4 hover:bg-atea-sand"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-atea-navy">{item.title}</div>
                    <div className="mt-0.5 text-[11px] text-black/50">
                      Opprettet {new Date(item.createdAt).toLocaleString("nb-NO")} ·{" "}
                      Sist oppdatert {new Date(item.updatedAt).toLocaleString("nb-NO")}
                    </div>
                    <div className="mt-1 text-[11px] text-black/60">
                      {item.model} · prompt {item.promptVersion}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <span className="rounded bg-atea-red/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-atea-red">
                      NO
                    </span>
                    {item.languages.map((lang) => (
                      <span
                        key={lang}
                        title={TARGET_LANGUAGE_LABELS[lang]}
                        className="rounded bg-atea-navy/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-atea-navy"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
