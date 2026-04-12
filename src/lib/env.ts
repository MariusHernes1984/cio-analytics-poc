import { z } from "zod";

/**
 * Environment variable schema for the CIO Analytics PoC.
 *
 * Crashes loudly on missing required vars at boot so that misconfiguration
 * is never silently masked. Only variables that are actually required at
 * runtime are marked required; PoC-phase optionals are marked optional with
 * sensible fallbacks.
 */
const EnvSchema = z.object({
  // Foundry
  FOUNDRY_RESOURCE: z.string().min(1, "FOUNDRY_RESOURCE is required (e.g. 'atea-cio-foundry')"),
  FOUNDRY_API_KEY: z.string().min(1, "FOUNDRY_API_KEY is required"),
  WRITER_MODEL: z.string().default("claude-sonnet-4-6"),
  TRANSLATOR_MODEL: z.string().default("claude-haiku-4-5"),

  // Storage
  STORAGE_MODE: z.enum(["local", "azure"]).default("local"),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  AZURE_STORAGE_ACCOUNT: z.string().optional(),
  AZURE_STORAGE_CONTAINER_PROMPTS: z.string().default("prompts"),
  AZURE_STORAGE_CONTAINER_ARTICLES: z.string().default("articles"),
  AZURE_STORAGE_CONTAINER_SOURCES: z.string().default("sources"),

  // Auth (PoC) — empty means "no auth" (dev only)
  POC_PASSWORD: z.string().optional(),

  // Observability
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nCheck .env.local or App Service Configuration.`,
    );
  }
  cached = parsed.data;

  // Cross-field validation that zod can't express cleanly
  if (cached.STORAGE_MODE === "azure" && !cached.AZURE_STORAGE_CONNECTION_STRING && !cached.AZURE_STORAGE_ACCOUNT) {
    throw new Error(
      "STORAGE_MODE=azure requires either AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT (for managed identity).",
    );
  }

  return cached;
}
