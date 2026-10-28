// The painted-colour snapshot's drift check (#273): tokens/painted.json holds
// what the pinned image paints today. A Playwright bump that changes how
// Chromium converts a colour fails here; `pnpm tokens:paint` re-paints.

import { beforeAll, expect, it } from "vitest";
import { readSources, type Sources } from "./build.ts";
import { drift } from "./paint.ts";

let sources: Sources;

beforeAll(async () => {
  sources = await readSources(import.meta.dirname);
});

it("holds every colour the build gives Figma as the pinned image paints it", () => {
  expect(drift(sources)).toEqual([]);
});

// surface-raised light: Chrome paints 247, culori's rounding gave 248.
it("names a colour whose snapshot entry is one step off what the image paints", () => {
  const nudged = structuredClone(sources);
  nudged.painted["oklch(0.97 0.006 330)"] = [248, 244, 247];

  expect(drift(nudged)).toEqual([
    "oklch(0.97 0.006 330) paints 247,244,247, but painted.json has 248,244,247",
  ]);
});
