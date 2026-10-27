// The Playwright pass of `pnpm gate`. It renders every selected story in each
// theme × density from the built Storybook and holds it to gate 4 (axe), gate
// 6 (zero-pixel baselines), gate 7 (render-time taste rules) and gate 8 (the
// story's own style expectations), then takes the shots the critique and the
// contact sheet read (ADR 0006, ADR 0009, ADR 0012).
// The generator's render pass runs it too, on one generated screen's own
// build, at its audience's density and with no baselines (ADR 0008): see
// generator/render.config.ts.

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderRules } from "./render-rules.ts";
import {
  logsPlayError,
  openStory,
  pauseAnimationsAtQuarter,
  phoneViewport,
  playAnimations,
  root,
  serveStorybook,
} from "./storybook-page.ts";
import {
  animatesWhileIdle,
  annotation,
  phone,
  renderTitle,
  renders,
  selectStories,
  shotName,
  targetsEnv,
  type Checks,
  type Shot,
} from "./stories.ts";

const storybookStatic = resolve(
  process.env.GATE_STORYBOOK ||
    resolve(import.meta.dirname, "../storybook-static")
);

// The generator's render pass: gates 4 and 7 only. A fresh generated screen
// has no baseline, and nobody reads its state shots (ADR 0008).
const renderOnly = Boolean(process.env.GATE_RENDER_ONLY);

// The gate's own tests seeding their scratch baselines (gates/gate.e2e.ts):
// nothing reads a seed run's checks, only the baselines it writes, so it
// skips the render-time taste rules, the slowest of them. Each rule leaves
// the page as it found it, so the baselines are the ones a full run shoots.
const seeding = Boolean(process.env.GATE_SEED);

// A comma-separated subset of the densities, for the render pass.
const densityFilter = process.env.GATE_DENSITIES?.split(",");

// The first control a keyboard user reaches, for the focus, hover and
// pressed shots.
const focusable =
  ':is(a[href], button, input, select, textarea, summary, [tabindex]):not([disabled], [tabindex="-1"])';

const index = JSON.parse(
  readFileSync(join(storybookStatic, "index.json"), "utf8")
);
const stories = selectStories(index, targetsEnv.read(process.env.GATE_TARGETS));

test.beforeEach(async ({ context }) => {
  await serveStorybook(context, storybookStatic);
});

for (const story of stories) {
  test.describe(story.id, () => {
    for (const render of renders([story]).filter(
      ({ density }) => !densityFilter || densityFilter.includes(density)
    )) {
      test(
        renderTitle(render),
        {
          annotation: { type: annotation.shot, description: shotName(render) },
        },
        async ({ page }, testInfo) => {
          // script-error (lint/taste/RULES.md): a render throws nothing and
          // logs no console error, from load to the last shot. Storybook logs
          // what a failing `play` threw, which is gate 8's to report.
          const pageErrors: string[] = [];
          const consoleErrors: string[] = [];
          page.on("pageerror", (error) =>
            pageErrors.push(`pageerror: ${error.message}`)
          );
          page.on("console", (message) => {
            if (message.type() === "error") consoleErrors.push(message.text());
          });
          const scriptErrors = () => [
            ...pageErrors,
            ...consoleErrors
              .filter((text) => !logsPlayError(text, playError))
              .map((text) => `console error: ${text}`),
          ];

          if (render.tags.includes(phone)) {
            await page.setViewportSize(phoneViewport);
          }
          const { playError } = await openStory(page, render);

          // Gate 4. A story is a fragment, not a page, so axe's rule that
          // all content sits in a landmark doesn't apply.
          const { violations } = await new AxeBuilder({ page })
            .include(root)
            .disableRules(["region"])
            .analyze();
          const taste: Checks["taste"] = {};
          for (const rule of renderRules) {
            taste[rule.name] = seeding ? [] : await rule.check(page, root);
          }
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
              .soft(
                taste[rule.name]!.map(
                  ({ message, selector }) => `${message} at ${selector}`
                ),
                `gate 7: ${rule.name}. ${rule.help}`
              )
              .toEqual([]);
          }

          // Gate 8: the story's `play` function, which the generator never
          // writes (ADR 0012), so the render pass's checks leave it out.
          expect
            .soft(
              playError ? [`${playError.name}: ${playError.message}`] : [],
              "gate 8: style expectations"
            )
            .toEqual([]);

          // What the generator's render pass reads back.
          await testInfo.attach(annotation.checks, {
            body: JSON.stringify({
              axe: violations.map(({ id, help, nodes }) => ({
                id,
                help,
                nodes: nodes.map(({ target, html }) => ({
                  target: target.join(" "),
                  html,
                })),
              })),
              taste,
            } satisfies Checks),
            contentType: "application/json",
          });

          if (renderOnly) {
            await shoot(page, "rest");
            expect.soft(scriptErrors(), "script-error").toEqual([]);
            return;
          }

          const name = shotName(render);
          await matchBaseline(page, `${name}.png`);

          await shoot(page, "rest");
          // Before the state shots, whose hover-out and release transitions
          // would otherwise still be running.
          if (render.tags.includes(animatesWhileIdle)) {
            await shootMidAnimation(page, `${name}--mid-animation.png`);
            await shootReducedMotion(page, `${name}--reduced-motion.png`);
          }
          await shootStates(page);

          expect.soft(scriptErrors(), "script-error").toEqual([]);
        }
      );
    }
  });
}

// Gate 6 for one baseline file. A missing baseline is written outside CI,
// and the contact sheet marks its render for the human to approve.
async function matchBaseline(
  page: Page,
  file: string,
  animations: "allow" | "disabled" = "disabled"
) {
  const testInfo = test.info();
  const baseline = testInfo.snapshotPath(file, { kind: "screenshot" });
  const isNew = !existsSync(baseline);
  await expect
    .soft(page.locator(root), "gate 6: baseline")
    .toHaveScreenshot(file, { animations });
  const marked = testInfo.annotations.some(
    ({ type }) => type === annotation.newBaseline
  );
  if (isNew && existsSync(baseline) && !marked) {
    testInfo.annotations.push({ type: annotation.newBaseline });
  }
}

async function shoot(
  page: Page,
  name: Shot,
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
// is invisible in it (ADR 0006, Consequences). This shot pauses it a quarter
// in, so it is the same each run; transitions belong to the state shots. The
// frame has a baseline: the dev Storybook doesn't minify, so a running
// animation can look right there and break only in the built CSS this pass
// renders.
async function shootMidAnimation(page: Page, baseline: string) {
  await pauseAnimationsAtQuarter(page);
  await matchBaseline(page, baseline, "allow");
  await shoot(page, "mid-animation", "allow");
  await playAnimations(page);
}

// What someone who asked for reduced motion sees in place of the idle
// animation (the brief's static edge). No other shot emulates it: the rest
// shot disables animations without matching `prefers-reduced-motion`.
async function shootReducedMotion(page: Page, baseline: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await matchBaseline(page, baseline);
  await shoot(page, "reduced-motion");
  await page.emulateMedia({ reducedMotion: null });
}
