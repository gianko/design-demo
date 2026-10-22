// `pnpm test:gate`: the gate's own end-to-end tests. They run the real
// `pnpm gate`, Docker included, so they stay out of `pnpm test`.

import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: resolve(import.meta.dirname, ".."),
    include: ["gates/gate.e2e.ts"],
    environment: "node",
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
