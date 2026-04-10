/**
 * Token cost estimator for Azure AI Foundry (Anthropic models).
 *
 * Prices are pay-as-you-go USD per 1M tokens (standard context, no caching).
 * Exchange rate is hardcoded for PoC simplicity.
 */

const USD_TO_NOK = 9.5;

/** USD per 1 million tokens */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6": { input: 5.0, output: 25.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};

const FALLBACK = { input: 3.0, output: 15.0 }; // assume sonnet if unknown

export function estimateCostNOK(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[model] ?? FALLBACK;
  const usd = (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
  return usd * USD_TO_NOK;
}

/** Format as "~kr 0,34" */
export function formatCostNOK(
  model: string,
  inputTokens: number,
  outputTokens: number,
): string {
  const nok = estimateCostNOK(model, inputTokens, outputTokens);
  return `~kr ${nok.toFixed(2).replace(".", ",")}`;
}
