/* eslint-disable no-console */
export {}; // mark as a module so top-level `main` doesn't collide with other scripts
/**
 * Seed default prompts into the configured PromptStore.
 *
 * Run with:
 *   npm run seed
 *
 * This always creates a new version from the defaults and sets it as
 * current. For the local store, auto-seeding on first access means you
 * normally don't need this — but it's useful to reset to pristine defaults
 * during development, or to bootstrap an empty Azure Blob container for
 * the first time.
 */

async function main() {
  const { getPromptStore } = await import("../src/lib/prompts/PromptStore");
  const { DEFAULT_PROMPTS } = await import("../src/lib/prompts/defaults");

  const store = await getPromptStore();

  for (const agent of ["writer", "translator"] as const) {
    const draft = DEFAULT_PROMPTS[agent];
    const saved = await store.saveNewVersion(agent, draft, {
      author: "seed-script",
      changeNote: "Seeded from defaults.ts",
    });
    console.log(`✓ ${agent}: seeded ${saved.version}`);
  }

  console.log("");
  console.log("✅ Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
