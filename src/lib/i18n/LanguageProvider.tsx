"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { t as tRaw, type UILang } from "./translations";

/* ── context ────────────────────────────────────────── */

interface LanguageContextValue {
  lang: UILang;
  setLang: (l: UILang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
});

/* ── provider (wrap in root layout) ─────────────────── */

export function LanguageProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: UILang;
}) {
  const router = useRouter();
  const [lang, setLangState] = useState<UILang>(initial);

  const setLang = useCallback(
    (l: UILang) => {
      document.cookie = `ui-lang=${l}; path=/; max-age=${365 * 24 * 3600}; SameSite=Lax`;
      setLangState(l);
      router.refresh(); // re-render server components with new cookie
    },
    [router],
  );

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/* ── hook for client components ─────────────────────── */

/**
 * Returns `{ t, lang, setLang }`.
 * `t(key)` already has the current language baked in.
 */
export function useTranslation() {
  const { lang, setLang } = useContext(LanguageContext);
  const t = useCallback((key: string) => tRaw(key, lang), [lang]);
  return { t, lang, setLang };
}
