import { notFound } from "next/navigation";
import { getArticleStore } from "@/lib/articles/ArticleStore";
import { ArticleViewer } from "@/components/ArticleViewer";
import { requireSession } from "@/lib/auth/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) {
    return <div className="p-10 text-sm text-red-700">Unauthorized.</div>;
  }

  const { id } = await params;
  const store = await getArticleStore();
  const article = await store.get(id);
  if (!article) notFound();

  return <ArticleViewer article={article} />;
}
