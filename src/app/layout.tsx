import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { getServerLang } from "@/lib/i18n/getServerLang";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIO Analytics · AI Studio",
  description: "Write and translate CIO Analytics articles with Claude in Foundry.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLang();

  return (
    <html lang={lang}>
      <body className="min-h-screen bg-atea-sand font-sans">
        <LanguageProvider initial={lang}>
          <div className="flex min-h-screen">
            <Nav />
            <main className="flex-1 overflow-x-hidden">{children}</main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
