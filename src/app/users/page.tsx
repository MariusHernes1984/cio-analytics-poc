import { requireSession } from "@/lib/auth/requireSession";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n/translations";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (session.user?.role !== "admin") redirect("/");

  const lang = await getServerLang();

  return (
    <div className="mx-auto max-w-5xl px-10 py-10">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-atea-red">
        {t("users.breadcrumb", lang)}
      </div>
      <h1 className="mb-2 text-3xl font-bold text-atea-navy">
        {t("users.title", lang)}
      </h1>
      <p className="mb-8 text-sm text-black/50">
        {t("users.description", lang)}
      </p>
      <UsersClient />
    </div>
  );
}
