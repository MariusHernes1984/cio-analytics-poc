"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * Sidebar navigation. Deliberately simple — no active-route highlighting,
 * no collapse. PoC quality. Shown on every page via root layout.
 */
export function Nav() {
  const { t, lang, setLang } = useTranslation();

  const NAV_ITEMS: Array<{ href: string; label: string; description: string }> = [
    { href: "/", label: t("nav.dashboard"), description: t("nav.dashboardDesc") },
    { href: "/write", label: t("nav.write"), description: t("nav.writeDesc") },
    { href: "/translate", label: t("nav.translate"), description: t("nav.translateDesc") },
    { href: "/articles", label: t("nav.articles"), description: t("nav.articlesDesc") },
    { href: "/prompts", label: t("nav.prompts"), description: t("nav.promptsDesc") },
  ];

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col border-r border-black/10 bg-white">
      <div className="border-b border-black/10 px-5 py-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-atea-red">
          Atea
        </div>
        <div className="mt-0.5 text-lg font-bold leading-tight text-atea-navy">
          CIO Analytics
        </div>
        <div className="mt-0.5 text-[11px] text-black/50">AI Studio · PoC</div>
      </div>
      <ul className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-md px-3 py-2 hover:bg-atea-sand"
            >
              <div className="text-sm font-medium text-atea-navy">{item.label}</div>
              <div className="text-[11px] text-black/50">{item.description}</div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-black/10 px-5 py-3 text-[11px] text-black/40">
        {t("nav.footer")}
        <div className="mt-2 flex gap-1">
          <button onClick={() => setLang("en")} className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${lang === "en" ? "bg-atea-green text-white" : "text-black/40 hover:text-black/70"}`}>EN</button>
          <button onClick={() => setLang("no")} className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${lang === "no" ? "bg-atea-green text-white" : "text-black/40 hover:text-black/70"}`}>NO</button>
        </div>
      </div>
    </nav>
  );
}
