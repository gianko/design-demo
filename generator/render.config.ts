// The generator's render pass (generator/render-gates.ts): the gate's own
// Playwright pass, in the same pinned image and with the same browser
// settings, over one generated screen's Storybook build. Its results go to
// GATE_OUT, inside the attempt's folder, so two runs never share output.

import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";
import gate from "../gates/playwright.config.ts";

const out = resolve(process.env.GATE_OUT || "gates/out/render");

export default defineConfig({
  testDir: "../gates",
  testMatch: "stories.spec.ts",
  outputDir: resolve(out, "results"),
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [["json", { outputFile: resolve(out, "results.json") }]],
  use: gate.use,
});
