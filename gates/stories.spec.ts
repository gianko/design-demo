// The Playwright pass of `pnpm gate`. It renders every selected story in each
// theme × density from the built Storybook and holds it to gate 4 (axe), gate
// 6 (zero-pixel baselines) and gate 7 (render-time taste rules), then takes
// the shots the critique and the contact sheet read (ADR 0006, ADR 0009).

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { renderRules } from "./render-rules.ts";
import {
  animatesWhileIdle,
  renders,
  selectStories,
  shotName,
  type Render,
} from "./stories.ts";

const storybookStatic = resolve(import.meta.dirname, "../storybook-static");

// The built Storybook is served from disk through a route, so there's no
// server to start, and any request that leaves it fails: a render never
// depends on the network.
const origin = "http://storybook.gate";

const root = "#storybook-root";

// The first control a keyboard user reaches, for the focus, hover and
// pressed shots.
const focusable =
  ':is(a[href], button, input, select, textarea, summary, [tabindex]):not([disabled], [tabindex="-1"])';

const index = JSON.parse(
  readFileSync(join(storybookStatic, "index.json"), "utf8")
);
const stories = selectStories(index, process.env.GATE_TARGET || undefined);

test.beforeEach(async ({ context }) => {
  await context.route("**/*", serve);
});

for (const story of stories) {
  test.describe(story.id, () => {
    for (const render of renders([story])) {
      test(
        `${render.theme} · ${render.density}`,
        { annotation: { type: "shot", description: shotName(render) } },
        async ({ page }, testInfo) => {
          await open(page, render);

          // Gate 4. A story is a fragment, not a page, so axe's rule that
          // all content sits in a landmark doesn't apply.
          const { violations } = await new AxeBuilder({ page })
            .include(root)
            .disableRules(["region"])
            .analyze();
          expect
            .soft(
              violations.map(
                (violation) =>
                  `${violation.id} (${violation.impact}): ${violation.help} at ${violation.nodes
                    .map((node) => node.target.join(" "))
                    .join(", ")}`
              ),
              "gate 4: axe"
            )
            .toEqual([]);

          // Gate 7.
          for (const rule of renderRules) {
            expect
              .soft(await rule.check(page, root), `gate 7: ${rule.name}`)
              .toEqual([]);
          }

          // Gate 6. A missing baseline is written outside CI, and the
          // contact sheet marks it for the human to approve.
          const name = shotName(render);
          const baseline = testInfo.snapshotPath(`${name}.png`, {
            kind: "screenshot",
          });
          const isNew = !existsSync(baseline);
          await expect
            .soft(page.locator(root), "gate 6: baseline")
            .toHaveScreenshot(`${name}.png`);
          if (isNew && existsSync(baseline)) {
            testInfo.annotations.push({ type: "new baseline" });
          }

          await shoot(page, "rest");
          await shootStates(page);
          if (render.tags.includes(animatesWhileIdle)) {
            await shootMidAnimation(page);
          }
        }
      );
    }
  });
}

async function serve(route: Route) {
  const url = new URL(route.request().url());
  if (url.origin !== origin) return route.abort();
  const file = join(storybookStatic, decodeURIComponent(url.pathname));
  if (
    !file.startsWith(storybookStatic + sep) ||
    !existsSync(file) ||
    !statSync(file).isFile()
  ) {
    return route.fulfill({ status: 404 });
  }
  return route.fulfill({ path: file });
}

async function open(page: Page, { id, theme, density }: Render) {
  await page.goto(
    `${origin}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme};density:${density}`
  );
  await page.locator("body.sb-show-main, body.sb-show-errordisplay").waitFor();
  if (await page.locator("body.sb-show-errordisplay").count()) {
    throw new Error(
      `The story failed to render: ${await page.locator("#error-message").innerText()}`
    );
  }
  await page.locator(`${root} > *`).first().waitFor();
  // Instrument Sans swaps in once loaded. Until then the fallback font
  // renders, which would flake gate 6 and give gate 7 the wrong metrics.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function shoot(
  page: Page,
  name: string,
  animations: "allow" | "disabled" = "disabled"
) {
  await test
    .info()
    .attach(name, {
      body: await page.locator(root).screenshot({ animations, caret: "hide" }),
      contentType: "image/png",
    });
}

async function shootStates(page: Page) {
  const control = page.locator(root).locator(focusable).first();
  if ((await control.count()) === 0) return;

  // Tab, not focus(), so the shot shows :focus-visible as a keyboard user
  // sees it.
  await page.keyboard.press("Tab");
  await expect(control, "the first control takes the first Tab").toBeFocused();
  await shoot(page, "focus");
  await control.blur();

  await control.hover();
  await shoot(page, "hover");
  await page.mouse.down();
  await shoot(page, "pressed");
  await page.mouse.up();
  await page.mouse.move(0, 0);
}

// The rest shot disables animations, so an idle animation (a pending sweep)
// is invisible in it (ADR 0006, Consequences). This shot pauses every
// animation halfway through its first iteration, so it is the same each run.
async function shootMidAnimation(page: Page) {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      const timing = animation.effect?.getComputedTiming();
      animation.pause();
      animation.currentTime =
        Number(timing?.delay ?? 0) + Number(timing?.duration ?? 0) / 2;
    }
  });
  await shoot(page, "mid-animation", "allow");
}
