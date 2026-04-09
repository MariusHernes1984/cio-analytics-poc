import { cookies } from "next/headers";
import type { UILang } from "./translations";

/**
 * Read the UI language from the `ui-lang` cookie (server-side).
 * Falls back to "en" (English) if the cookie is missing or invalid.
 */
export async function getServerLang(): Promise<UILang> {
  const store = await cookies();
  const value = store.get("ui-lang")?.value;
  return value === "no" ? "no" : "en";
}
