import { requireSession } from "@/lib/auth/requireSession";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n/translations";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { StatisticsClient } from "./StatisticsClient";

export default async function StatisticsPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/");

  const lang = await getServerLang();

  return (
    <div className="mx-auto max-w-5xl px-10 py-10">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-atea-red">
        {t("stats.breadcrumb", lang)}
      </div>
      <h1 className="mb-8 text-3xl font-bold text-atea-navy">
        {t("stats.title", lang)}
      </h1>
      <StatisticsClient />
    </div>
  );
}
