/* eslint-disable no-console */
/**
 * Smoke test for Foundry connectivity.
 *
 * Run with:
 *   npm run test:foundry
 *
 * Requires FOUNDRY_RESOURCE and FOUNDRY_API_KEY in .env.local (loaded
 * automatically via tsx --env-file in the npm script).
 *
 * This is the FIRST thing to verify after provisioning your Foundry resource
 * in Sweden Central. If this fails, nothing else will work.
 */

async function main() {
  const { getFoundryClient } = await import("../src/lib/foundry/client");
  const { getEnv } = await import("../src/lib/env");

  const env = getEnv();
  console.log(`→ Foundry resource: ${env.FOUNDRY_RESOURCE}`);
  console.log(`→ Writer model:     ${env.WRITER_MODEL}`);
  console.log(`→ Translator model: ${env.TRANSLATOR_MODEL}`);
  console.log("");

  const client = getFoundryClient();

  // --- Test 1: tiny hello in Norwegian with the writer model ---
  console.log("Test 1: small request to writer model...");
  const t1Start = Date.now();
  try {
    const response = await client.messages.create({
      model: env.WRITER_MODEL,
      max_tokens: 32,
      messages: [{ role: "user", content: "Si 'hei' på norsk og nevn publikasjonen Atea CIO Analytics i samme setning." }],
    });
    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("");
    console.log(`  ✓ ${Date.now() - t1Start}ms`);
    console.log(`  Response: ${text}`);
    console.log(`  Usage: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`);
  } catch (error) {
    console.error("  ✗ Writer model call FAILED");
    console.error(error);
    process.exit(1);
  }
  console.log("");

  // --- Test 2: tiny translation with the translator model ---
  console.log("Test 2: small request to translator model...");
  const t2Start = Date.now();
  try {
    const response = await client.messages.create({
      model: env.TRANSLATOR_MODEL,
      max_tokens: 32,
      messages: [
        {
          role: "user",
          content: "Oversett 'God morgen' til engelsk. Svar kun med oversettelsen, ingen forklaring.",
        },
      ],
    });
    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("");
    console.log(`  ✓ ${Date.now() - t2Start}ms`);
    console.log(`  Response: ${text}`);
    console.log(`  Usage: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`);
  } catch (error) {
    console.error("  ✗ Translator model call FAILED");
    console.error(error);
    process.exit(1);
  }
  console.log("");

  console.log("✅ Foundry connectivity verified. Both models reachable.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
