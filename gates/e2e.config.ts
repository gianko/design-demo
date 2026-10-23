// `pnpm test:gate`: the gate's own end-to-end tests. They run the real
// `pnpm gate`, Docker included, so they stay out of `pnpm test`. A full run
// takes minutes and each case is capped at 5, so it needs no outer timeout;
// `pnpm test:gate -t "<case name>"` runs only the cases you're changing.
// Only one run at a time per checkout (run-lock.ts).

import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: resolve(import.meta.dirname, ".."),
    include: ["gates/gate.e2e.ts"],
    globalSetup: ["gates/e2e.setup.ts"],
    environment: "node",
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
