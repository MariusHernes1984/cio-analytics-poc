import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { toMarkdownFile } from "@/lib/export/markdown";
import { requireSession } from "@/lib/auth/requireSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  markdown: z.string().min(1).max(100_000),
  title: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { filename, content } = toMarkdownFile(parsed.data.markdown, parsed.data.title);
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
