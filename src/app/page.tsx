import Link from "next/link";
import { getArticleStore } from "@/lib/articles/ArticleStore";
import { TARGET_LANGUAGE_LABELS } from "@/lib/agents/types";
import { requireSession } from "@/lib/auth/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  if (!session.ok) {
    return (
      <div className="p-10 text-sm text-red-700">Unauthorized. Check your session.</div>
    );
  }

  const store = await getArticleStore();
  const items = (await store.list()).slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-10 py-10">
      <header className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">
          Dashboard
        </div>
        <h1 className="mt-1 text-3xl font-bold text-atea-navy">CIO Analytics · AI Studio</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          Skriv nye norske CIO Analytics-artikler og oversett eksisterende artikler til engelsk,
          svensk, dansk og finsk. Alle prompts kan redigeres live uten redeploy.
        </p>
      </header>

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CtaCard
          href="/write"
          title="Skriv ny artikkel"
          description="Brief + researchmateriale → 600–900 ord norsk case-study."
          accent="primary"
        />
        <CtaCard
          href="/translate"
          title="Oversett artikkel"
          description="Parallell oversettelse til en, sv, da, fi — med executive-register."
          accent="secondary"
        />
        <CtaCard
          href="/prompts"
          title="Rediger agenter"
          description="Endre system-prompts, modell og temperatur — ingen redeploy."
          accent="ghost"
        />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-atea-navy">Siste artikler</h2>
          <Link href="/articles" className="text-xs text-atea-navy underline hover:text-atea-red">
            Se alle →
          </Link>
        </div>
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
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-atea-sand"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-atea-navy">{item.title}</div>
                    <div className="mt-0.5 text-[11px] text-black/50">
                      {new Date(item.createdAt).toLocaleString("nb-NO")} · {item.model} ·{" "}
                      {item.promptVersion}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {item.languages.length === 0 ? (
                      <span className="text-[10px] text-black/30">Kun NO</span>
                    ) : (
                      item.languages.map((lang) => (
                        <span
                          key={lang}
                          title={TARGET_LANGUAGE_LABELS[lang]}
                          className="rounded bg-atea-navy/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-atea-navy"
                        >
                          {lang}
                        </span>
                      ))
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CtaCard({
  href,
  title,
  description,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  accent: "primary" | "secondary" | "ghost";
}) {
  const classes: Record<typeof accent, string> = {
    primary: "bg-atea-green text-white hover:bg-atea-green/90",
    secondary: "bg-atea-red text-white hover:bg-atea-red/90",
    ghost: "bg-white text-atea-navy border border-black/10 hover:bg-atea-sand",
  };
  return (
    <Link
      href={href}
      className={`block rounded-lg p-5 shadow-sm transition ${classes[accent]}`}
    >
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-1 text-xs opacity-80">{description}</div>
    </Link>
  );
}
