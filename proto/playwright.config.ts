import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "gates",
  snapshotPathTemplate: "gates/__baselines__/{arg}{ext}",
  reporter: [["list"], ["json", { outputFile: "gates-out/playwright.json" }]],
  workers: 4,
  use: { baseURL: "http://127.0.0.1:6007", viewport: { width: 640, height: 400 } },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled" } },
  webServer: { command: "http-server storybook-static -p 6007 -s", url: "http://127.0.0.1:6007/index.json", reuseExistingServer: true },
});
