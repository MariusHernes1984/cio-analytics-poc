/**
 * Token cost estimator for Azure AI Foundry (Anthropic models).
 *
 * Prices are pay-as-you-go USD per 1M tokens (standard context, no caching).
 * Exchange rate is hardcoded for PoC simplicity.
 */

const USD_TO_NOK = 9.5;

/** USD per 1 million tokens: { input, output, thinking } */
const PRICING: Record<string, { input: number; output: number; thinking: number }> = {
  "claude-opus-4-6":          { input: 5.0, output: 25.0, thinking: 25.0 },
  "claude-opus-4-6-extended": { input: 5.0, output: 25.0, thinking: 25.0 },
  "claude-sonnet-4-6":        { input: 3.0, output: 15.0, thinking: 15.0 },
  "claude-haiku-4-5":         { input: 1.0, output: 5.0,  thinking: 5.0 },
};

const FALLBACK = { input: 3.0, output: 15.0, thinking: 15.0 };

export function estimateCostUSD(
  model: string,
  inputTokens: number,
  outputTokens: number,
  thinkingTokens: number = 0,
): number {
  const p = PRICING[model] ?? FALLBACK;
  return (inputTokens * p.input + outputTokens * p.output + thinkingTokens * p.thinking) / 1_000_000;
}

export function estimateCostNOK(
  model: string,
  inputTokens: number,
  outputTokens: number,
  thinkingTokens: number = 0,
): number {
  return estimateCostUSD(model, inputTokens, outputTokens, thinkingTokens) * USD_TO_NOK;
}

/** Format cost in the appropriate currency based on language. */
export function formatCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  lang: "en" | "no" = "no",
  thinkingTokens: number = 0,
): string {
  if (lang === "en") {
    const usd = estimateCostUSD(model, inputTokens, outputTokens, thinkingTokens);
    return `~$${usd.toFixed(2)}`;
  }
  const nok = estimateCostNOK(model, inputTokens, outputTokens, thinkingTokens);
  return `~kr ${nok.toFixed(2).replace(".", ",")}`;
}

/** Format a raw amount in the appropriate currency. */
export function formatAmount(amount: number, lang: "en" | "no" = "no"): string {
  if (lang === "en") {
    const usd = amount / USD_TO_NOK;
    return `$${usd.toFixed(2)}`;
  }
  return `kr ${amount.toFixed(2).replace(".", ",")}`;
}
