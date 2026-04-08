import { getEnv } from "@/lib/env";

/**
 * Authentication seam for Foundry/Claude.
 *
 * PoC: API key from env var.
 * Production (future): DefaultAzureCredential with scope
 *   'https://ai.azure.com/.default' and the resulting bearer token passed
 *   via the SDK's defaultHeaders as `Authorization: Bearer <token>`.
 *
 * All Foundry auth concerns live in this file so the migration is a
 * single-file change. Do NOT sprinkle API-key references elsewhere.
 */
export type FoundryAuth =
  | { kind: "apiKey"; apiKey: string }
  | { kind: "bearer"; token: string };

export function getFoundryAuth(): FoundryAuth {
  const env = getEnv();
  return { kind: "apiKey", apiKey: env.FOUNDRY_API_KEY };
}

// Future (do not delete — this is the migration template):
//
// import { DefaultAzureCredential } from "@azure/identity";
// const credential = new DefaultAzureCredential();
// export async function getFoundryAuth(): Promise<FoundryAuth> {
//   const token = await credential.getToken("https://ai.azure.com/.default");
//   if (!token) throw new Error("Failed to acquire Foundry token via managed identity");
//   return { kind: "bearer", token: token.token };
// }
