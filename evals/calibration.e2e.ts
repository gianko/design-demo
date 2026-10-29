// The calibration set's render step (evals/calibration.ts): a broken copy
// renders through the render pass as a generated screen does, with its kept
// screen's stories, at its brief's audience density, and leaves a light rest
// shot per state for the judge. It runs the real Storybook build and the
// Playwright pass in the pinned image, so it needs Docker and runs in
// `pnpm test:gate`.

import { randomUUID } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { calibrationSet, renderSetScreen } from "./calibration.ts";
import { repo } from "../repo.ts";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

it("renders a broken copy's light shot for each of its kept screen's states", async () => {
  const copy = calibrationSet().find(({ id }) => id === "bulk-pay--density")!;
  const dir = join(repo, ".generated", `vitest-${randomUUID()}`);
  dirs.push(dir);

  const shots = await renderSetScreen(copy, join(dir, copy.id));

  expect(shots.map(({ state }) => state)).toEqual([
    "default",
    "empty",
    "payment-scheduled",
    "payment-failed",
    "default, rows ticked",
  ]);
  for (const { png } of shots) {
    expect(png.subarray(1, 4).toString()).toBe("PNG");
  }
  // At the admin brief's density, as the render pass renders bulk-pay.
  const log = readFileSync(join(dir, copy.id, "render/playwright.log"), "utf8");
  expect(log).toContain("light · admin");
}, 300_000);
