import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPromptStore } from "@/lib/prompts/PromptStore";
import { requireSession } from "@/lib/auth/requireSession";
import type { AgentId } from "@/lib/agents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AgentParam = z.enum(["writer", "translator"]);

const SaveBodySchema = z.object({
  systemPrompt: z.string().min(50).max(50_000),
  model: z.string().min(1),
  maxTokens: z.number().int().min(256).max(16_000),
  temperature: z.number().min(0).max(2),
  variables: z.array(z.string()).default([]),
  author: z.string().min(1).max(120),
  changeNote: z.string().min(1).max(500),
});

const SetCurrentBodySchema = z.object({
  action: z.literal("set-current"),
  version: z.string().regex(/^v\d{4,}$/),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agent: string }> },
) {
  const session = await requireSession();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agent: agentRaw } = await params;
  const agentResult = AgentParam.safeParse(agentRaw);
  if (!agentResult.success) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 404 });
  }
  const agent: AgentId = agentResult.data;

  const store = await getPromptStore();
  const [current, versions] = await Promise.all([
    store.getCurrent(agent),
    store.listVersions(agent),
  ]);
  return NextResponse.json({ current, versions });
}

/** PUT = save a new version. POST {action:"set-current"} = rollback. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agent: string }> },
) {
  const session = await requireSession();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agent: agentRaw } = await params;
  const agentResult = AgentParam.safeParse(agentRaw);
  if (!agentResult.success) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SaveBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const store = await getPromptStore();
  const saved = await store.saveNewVersion(
    agentResult.data,
    {
      systemPrompt: parsed.data.systemPrompt,
      model: parsed.data.model,
      maxTokens: parsed.data.maxTokens,
      temperature: parsed.data.temperature,
      variables: parsed.data.variables,
    },
    { author: parsed.data.author, changeNote: parsed.data.changeNote },
  );
  return NextResponse.json(saved);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agent: string }> },
) {
  const session = await requireSession();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agent: agentRaw } = await params;
  const agentResult = AgentParam.safeParse(agentRaw);
  if (!agentResult.success) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SetCurrentBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const store = await getPromptStore();
  await store.setCurrent(agentResult.data, parsed.data.version);
  return NextResponse.json({ ok: true, current: parsed.data.version });
}
