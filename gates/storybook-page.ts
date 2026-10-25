// Opening one story of a built Storybook in a Playwright page, as the gate's
// pass does: served from disk, fonts loaded, and optionally paused partway
// through its animations. Shared by the pass (stories.spec.ts) and
// `pnpm gate:measure`.

import type { BrowserContext, Page, Route } from "@playwright/test";
import { existsSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import type { Density, Theme } from "../.storybook/globals.ts";

// The built Storybook is served from disk through a route, so there's no
// server to start, and any request that leaves it fails: a render never
// depends on the network.
const origin = "http://storybook.gate";

export const root = "#storybook-root";

export async function serveStorybook(context: BrowserContext, dir: string) {
  await context.route("**/*", (route: Route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    const file = join(dir, decodeURIComponent(url.pathname));
    if (
      !file.startsWith(dir + sep) ||
      !existsSync(file) ||
      !statSync(file).isFile()
    ) {
      return route.fulfill({ status: 404 });
    }
    return route.fulfill({ path: file });
  });
}

export async function openStory(
  page: Page,
  { id, theme, density }: { id: string; theme: Theme; density: Density }
) {
  await page.goto(
    `${origin}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme};density:${density}`
  );
  // A story that throws can show main for a moment before the error display.
  await page
    .locator(`body.sb-show-main ${root} > *, body.sb-show-errordisplay`)
    .first()
    // The body reads as hidden while the error display shows.
    .waitFor({ state: "attached" });
  if (await page.locator("body.sb-show-errordisplay").count()) {
    throw new Error(
      `The story failed to render: ${await page.locator("#error-message").innerText()}`
    );
  }
  // Instrument Sans swaps in once loaded. Until then the fallback font
  // renders, which would flake gate 6 and give gate 7 the wrong metrics.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

// Pauses each CSS animation a quarter into its first iteration, so a frame of
// an idle animation is the same each run. Not halfway: a loop can wrap there,
// and the sweep is out of view at 50%. Transitions are left alone.
export async function pauseAnimationsAtQuarter(page: Page) {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (!(animation instanceof CSSAnimation)) continue;
      const timing = animation.effect!.getComputedTiming();
      animation.pause();
      animation.currentTime =
        Number(timing.delay) + Number(timing.duration) / 4;
    }
  });
}

export async function playAnimations(page: Page) {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.play();
  });
}
