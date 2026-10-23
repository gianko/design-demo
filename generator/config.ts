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
