// The per-step config (ADR 0003, ADR 0010): model, effort, max_tokens and the
// attempt limit, part of every results file's version tuple. Opus 5.5 can't
// turn thinking off, so effort is set explicitly on both steps.

export type StepConfig = {
  model: "claude-opus-5-5";
  effort: "medium" | "high";
  maxTokens: number;
  attempts: number;
};

export const stepConfig = {
  spec: {
    model: "claude-opus-5-5",
    effort: "medium",
    maxTokens: 32_000,
    attempts: 3,
  },
  code: {
    model: "claude-opus-5-5",
    effort: "high",
    maxTokens: 64_000,
    attempts: 3,
  },
} as const satisfies Record<"spec" | "code", StepConfig>;

// USD per million tokens, from Anthropic's published prices. Cache writes
// are 5-minute writes, at 1.25× input, the only kind the prompts ask for.
export const pricing = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
} as const satisfies Record<
  StepConfig["model"],
  Record<"input" | "output" | "cacheRead" | "cacheWrite", number>
>;

// What one call cost, from its logged usage.
export function cost(
  model: StepConfig["model"],
  usage: Record<keyof (typeof pricing)[StepConfig["model"]], number>
) {
  const prices = pricing[model];
  const total =
    usage.input * prices.input +
    usage.output * prices.output +
    usage.cacheRead * prices.cacheRead +
    usage.cacheWrite * prices.cacheWrite;
  return total / 1_000_000;
}
