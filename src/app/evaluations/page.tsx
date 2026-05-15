import { EvaluationsClient } from "@/app/evaluations/EvaluationsClient";
import { requireSession } from "@/lib/auth/requireSession";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/translations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EvaluationsPage() {
  const lang = await getServerLang();
  const session = await requireSession();
  if (!session.ok || session.user?.role !== "admin") {
    return <div className="p-10 text-sm text-red-700">{t("common.unauthorized", lang)}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-10 py-10">
      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">
          {t("evaluations.section", lang)}
        </div>
        <h1 className="mt-1 text-3xl font-bold text-atea-navy">{t("evaluations.title", lang)}</h1>
        <p className="mt-2 max-w-3xl text-sm text-black/60">
          {t("evaluations.description", lang)}
        </p>
      </header>

      <EvaluationsClient />
    </div>
  );
}
