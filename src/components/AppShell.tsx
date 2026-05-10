"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/Nav";

/**
 * App shell — shows sidebar nav on all pages except /login.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
