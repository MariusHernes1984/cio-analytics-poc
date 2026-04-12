/**
 * Extended thinking helper.
 *
 * When the model string ends with "-extended", we strip the suffix to get the
 * real model name and enable extended thinking with a generous budget.
 *
 * Extended thinking lets Claude reason through complex tasks before responding,
 * producing higher-quality output at the cost of additional thinking tokens.
 */

const THINKING_BUDGET = 100_000; // effectively unlimited — we just monitor usage

export interface ThinkingConfig {
  /** The actual model name to send to the API (suffix stripped). */
  apiModel: string;
  /** Whether extended thinking is enabled for this request. */
  isExtended: boolean;
}

/**
 * Parse a model string. If it ends with "-extended", enable thinking.
 *
 *   "claude-opus-4-6"          → { apiModel: "claude-opus-4-6", isExtended: false }
 *   "claude-opus-4-6-extended" → { apiModel: "claude-opus-4-6", isExtended: true }
 */
export function parseThinkingConfig(model: string): ThinkingConfig {
  if (model.endsWith("-extended")) {
    return {
      apiModel: model.replace(/-extended$/, ""),
      isExtended: true,
    };
  }
  return { apiModel: model, isExtended: false };
}

/**
 * Build the extra parameters for `client.messages.stream()` when extended
 * thinking is enabled. Merge these into the call options.
 *
 * Note: extended thinking requires temperature=1 (Anthropic constraint).
 */
export function getThinkingParams(config: ThinkingConfig): Record<string, unknown> {
  if (!config.isExtended) return {};
  return {
    thinking: {
      type: "enabled",
      budget_tokens: THINKING_BUDGET,
    },
    temperature: 1, // required by the API when thinking is enabled
  };
}
