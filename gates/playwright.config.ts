// The Playwright pass of `pnpm gate`. It runs only inside the pinned image
// (ADR 0009); gates/run.ts starts it there.

import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";
import { chromiumArgs } from "./image.ts";

export default defineConfig({
  testDir: ".",
  testMatch: "stories.spec.ts",
  // gates/baselines/<story-id>--<theme>-<density>.png (ADR 0009). The gate's
  // own tests point GATE_BASELINES at a scratch directory instead.
  snapshotPathTemplate: `${resolve(process.env.GATE_BASELINES || "gates/baselines")}/{arg}{ext}`,
  outputDir: "out/results",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "out/report", open: "never" }],
    ["./contact-sheet.ts", { outputFolder: "out/contact-sheet" }],
    ["json", { outputFile: "out/results.json" }],
  ],
  expect: {
    // One renderer makes every baseline, so no pixel may differ, by any
    // amount: Playwright's default per-pixel threshold lets a faint colour
    // change through.
    toHaveScreenshot: {
      maxDiffPixels: 0,
      threshold: 0,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    browserName: "chromium",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    launchOptions: { args: chromiumArgs },
  },
});
