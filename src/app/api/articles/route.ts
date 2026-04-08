import { NextResponse } from "next/server";
import { getArticleStore } from "@/lib/articles/ArticleStore";
import { requireSession } from "@/lib/auth/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getArticleStore();
  const items = await store.list();
  return NextResponse.json({ items });
}
