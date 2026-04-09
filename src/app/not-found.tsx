import Link from "next/link";
import { t } from "@/lib/i18n/translations";
import { getServerLang } from "@/lib/i18n/getServerLang";

export default async function NotFound() {
  const lang = await getServerLang();

  return (
    <div className="mx-auto max-w-xl px-10 py-20 text-center">
      <div className="text-5xl font-bold text-atea-navy">404</div>
      <div className="mt-2 text-lg text-black/60">{t("notFound.message", lang)}</div>
      <Link
        href="/"
        className="mt-6 inline-block rounded bg-atea-green px-4 py-2 text-sm font-semibold text-white hover:bg-atea-green/90"
      >
        {t("notFound.back", lang)}
      </Link>
    </div>
  );
}
