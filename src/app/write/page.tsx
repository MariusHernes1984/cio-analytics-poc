import { WriterForm } from "@/components/WriterForm";
import { requireSession } from "@/lib/auth/requireSession";
import { t } from "@/lib/i18n/translations";
import { getServerLang } from "@/lib/i18n/getServerLang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WritePage() {
  const session = await requireSession();
  if (!session.ok) {
    return <div className="p-10 text-sm text-red-700">Unauthorized.</div>;
  }

  const lang = await getServerLang();

  return (
    <div className="mx-auto max-w-7xl px-10 py-10">
      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">{t("write.section", lang)}</div>
        <h1 className="mt-1 text-3xl font-bold text-atea-navy">{t("write.title", lang)}</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          {t("write.description", lang)}{" "}
          <code className="rounded bg-atea-navy/5 px-1">{t("write.sourceMissing", lang)}</code>.
        </p>
      </header>

      <WriterForm />
    </div>
  );
}
