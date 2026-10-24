// `pnpm test:gate`: the end-to-end tests that render in the pinned image.
// They run the real `pnpm gate` or the generator's render pass, Docker
// included, so they stay out of `pnpm test` (ADR 0009). A full run takes
// minutes and each case is capped at 5, so it needs no outer timeout;
// `pnpm test:gate -t "<case name>"` runs only the cases you're changing.
// Only one run at a time per checkout (run-lock.ts).

import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: resolve(import.meta.dirname, ".."),
    // The gate's cases, the kept screen's (spec § Keep) and the generator's
    // render pass.
    include: [
      "gates/gate.e2e.ts",
      "generator/keep.e2e.ts",
      "generator/render-gates.e2e.ts",
    ],
    // Every file runs `pnpm gate` or a Storybook build over the one
    // checkout, and the first two plant files in src/ that the others' runs
    // would pick up, so one file at a time.
    fileParallelism: false,
    globalSetup: ["gates/e2e.setup.ts"],
    environment: "node",
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
