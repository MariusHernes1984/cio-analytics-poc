import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIO Analytics · AI Studio",
  description: "Skriv og oversett CIO Analytics-artikler med Claude i Foundry.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body className="min-h-screen bg-atea-sand font-sans">
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
