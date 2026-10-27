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

// The phone width a story tagged `phone` renders at, in place of the
// config's 1280×800 (ADR 0012).
export const phoneViewport = { width: 360, height: 800 };

// What a story's `play` function threw, as Storybook serialises it.
export type PlayError = { name: string; message: string; stack?: string };

// What the page records of the play phase, on `window.__gatePlay`.
type PlayState = { settled: boolean; error?: PlayError };
type Played = { __gatePlay: PlayState };

// Storybook's render phases from the end of `play` on. A story without
// `play` goes from rendering straight to completing.
const settledPhases = [
  "played",
  "errored",
  "completing",
  "completed",
  "afterEach",
  "finished",
  "aborted",
];

// Opens a story and waits until its `play` function, if any, has finished or
// failed (ADR 0012). Storybook shows a story before its play phase runs, and
// a failing `play` leaves the story shown: the error only reaches the
// channel, and the console. So the page records the channel's events from
// the start, and this returns what `play` threw. `globals` are set beside
// the theme and density; Storybook drops a value with characters other than
// letters, digits, spaces, `-` and `_`.
export async function openStory(
  page: Page,
  {
    id,
    theme,
    density,
    globals = {},
  }: {
    id: string;
    theme: Theme;
    density: Density;
    globals?: Record<string, string>;
  }
): Promise<{ playError?: PlayError }> {
  await page.addInitScript((settled) => {
    const play: PlayState = { settled: false };
    Object.assign(window, { __gatePlay: play } satisfies Played);
    // Storybook installs its channel here before it renders anything.
    let channel: {
      on: (event: string, listener: (payload: never) => void) => void;
    };
    Object.defineProperty(window, "__STORYBOOK_ADDONS_CHANNEL__", {
      configurable: true,
      get: () => channel,
      set(next: typeof channel) {
        channel = next;
        next?.on(
          "storyRenderPhaseChanged",
          ({ newPhase }: { newPhase: string }) => {
            if (settled.includes(newPhase)) play.settled = true;
          }
        );
        next?.on("playFunctionThrewException", (error: PlayError) => {
          play.error = error;
        });
      },
    });
  }, settledPhases);
  const set = Object.entries({ theme, density, ...globals })
    .map(([name, value]) => `${name}:${encodeURIComponent(value)}`)
    .join(";");
  await page.goto(
    `${origin}/iframe.html?id=${id}&viewMode=story&globals=${set}`
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
  await page.waitForFunction(
    () => (window as unknown as Played).__gatePlay.settled
  );
  const playError = await page.evaluate(
    () => (window as unknown as Played).__gatePlay.error
  );
  return playError ? { playError } : {};
}

// One of the open story's parameters, as JSON, read from Storybook's
// preview as its test runner reads a story's context.
export async function storyParameter(
  page: Page,
  id: string,
  name: string
): Promise<unknown> {
  return page.evaluate(
    async ([id, name]) => {
      type Preview = {
        storyStore: {
          loadStory(options: {
            storyId: string;
          }): Promise<{ parameters: Record<string, unknown> }>;
        };
      };
      const { storyStore } = (
        window as unknown as { __STORYBOOK_PREVIEW__: Preview }
      ).__STORYBOOK_PREVIEW__;
      const { parameters } = await storyStore.loadStory({ storyId: id });
      const value = parameters[name];
      return value === undefined
        ? undefined
        : JSON.parse(JSON.stringify(value));
    },
    [id, name] as const
  );
}

// Whether a console error is Storybook logging what `play` threw, which gate
// 8 reports in place of script-error.
export function logsPlayError(text: string, error: PlayError | undefined) {
  return (
    error !== undefined && text.startsWith(`${error.name}: ${error.message}`)
  );
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
