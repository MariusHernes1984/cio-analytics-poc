import { NextResponse } from "next/server";
import { pingFoundry } from "@/lib/foundry/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health endpoint — makes a tiny Foundry call to prove the whole chain
 * works (env, SDK, auth, network, model deployment). Used by Azure health
 * checks and as a smoke test after deploy.
 */
export async function GET() {
  try {
    const result = await pingFoundry();
    if (!result.ok) {
      return NextResponse.json(
        { status: "error", foundry: "unreachable", error: result.error },
        { status: 503 },
      );
    }
    return NextResponse.json({
      status: "ok",
      foundry: "reachable",
      model: result.model,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
