import type { Metadata } from "next";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { UserProvider } from "@/lib/auth/UserProvider";
import { requireSession } from "@/lib/auth/requireSession";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIO Analytics · AI Studio",
  description: "Write and translate CIO Analytics articles with Claude in Foundry.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLang();
  const session = await requireSession();
  const user = session.ok && session.user ? session.user : null;

  return (
    <html lang={lang}>
      <body className="min-h-screen bg-atea-sand font-sans">
        <LanguageProvider initial={lang}>
          <UserProvider user={user}>
            <AppShell>{children}</AppShell>
          </UserProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
