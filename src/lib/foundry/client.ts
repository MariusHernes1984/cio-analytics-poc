import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";
import { getFoundryAuth } from "@/lib/foundry/auth";

/**
 * Cached Anthropic SDK client pointed at Microsoft Foundry.
 *
 * The SDK appends `/v1/messages` automatically. Foundry Claude only responds
 * at /anthropic/* paths — do NOT use the OpenAI-compatible path.
 *
 * Docs: https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-claude
 */
let cached: Anthropic | null = null;

export function getFoundryClient(): Anthropic {
  if (cached) return cached;

  const env = getEnv();
  const auth = getFoundryAuth();

  const baseURL = `https://${env.FOUNDRY_RESOURCE}.services.ai.azure.com/anthropic`;

  if (auth.kind === "apiKey") {
    cached = new Anthropic({
      apiKey: auth.apiKey,
      baseURL,
      timeout: 120_000, // 120s — long enough for Sonnet 4.6 generating 900 words
      maxRetries: 1, // streaming requests shouldn't silently retry
    });
  } else {
    cached = new Anthropic({
      apiKey: "unused-when-using-bearer", // SDK requires non-empty; header overrides
      baseURL,
      timeout: 120_000,
      maxRetries: 1,
      defaultHeaders: {
        Authorization: `Bearer ${auth.token}`,
      },
    });
  }

  return cached;
}

/**
 * Test connectivity to Foundry with a tiny request. Used by /api/health.
 */
export async function pingFoundry(): Promise<{ ok: boolean; model?: string; error?: string }> {
  try {
    const env = getEnv();
    const client = getFoundryClient();
    const response = await client.messages.create({
      model: env.WRITER_MODEL,
      max_tokens: 16,
      messages: [{ role: "user", content: "Si 'ok' på norsk." }],
    });
    return { ok: true, model: response.model };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
