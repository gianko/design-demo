// `pnpm gate:measure <story-id> [--theme light|dark] [--density admin|contractor]
// [--mid-animation] [--reduced-motion] [--no-build]`: prints the box and the
// moving parts' computed styles of every element in one story, rendered from
// the built Storybook as the gate renders it. Reading these beats reading a
// screenshot's pixels to tell what is drawn where. It builds Storybook first,
// so it measures the production CSS the gate sees (the dev server doesn't
// minify); `--no-build` reuses storybook-static/. It runs the host's Chromium
// (`pnpm exec playwright install chromium`), not the pinned image: boxes and
// styles match the gate's, antialiasing may not.

import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  densities,
  themes,
  type Density,
  type Theme,
} from "../.storybook/globals.ts";
import {
  openStory,
  pauseAnimationsAtQuarter,
  root,
  serveStorybook,
} from "./storybook-page.ts";
import { repo } from "../repo.ts";

const usage = `Usage: pnpm gate:measure <story-id> [--theme ${themes.join("|")}] [--density ${densities.join("|")}] [--mid-animation] [--reduced-motion] [--no-build]`;

let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: {
      theme: { type: "string", default: "light" },
      density: { type: "string", default: "admin" },
      "mid-animation": { type: "boolean", default: false },
      "reduced-motion": { type: "boolean", default: false },
      "no-build": { type: "boolean", default: false },
    },
  });
} catch (error) {
  fail(`${(error as Error).message}\n${usage}`);
}
const { positionals, values } = args;
const [id] = positionals;
const theme = values.theme as Theme;
const density = values.density as Density;
if (
  positionals.length !== 1 ||
  !themes.includes(theme) ||
  !densities.includes(density)
) {
  fail(usage);
}

if (!values["no-build"]) {
  const { status } = spawnSync("pnpm", ["storybook:build", "--quiet"], {
    cwd: repo,
    stdio: "inherit",
  });
  if (status !== 0) process.exit(status ?? 1);
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    reducedMotion: values["reduced-motion"] ? "reduce" : "no-preference",
  });
  await serveStorybook(context, resolve(repo, "storybook-static"));
  const page = await context.newPage();
  await openStory(page, { id: id!, theme, density });
  if (values["mid-animation"]) await pauseAnimationsAtQuarter(page);
  console.log(await measure(page));
} finally {
  await browser.close();
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// One line per element, indented by depth: its tag and data-component, its
// box relative to the story root's top left, and any transform, translate,
// scale, opacity or running animation that moves it.
async function measure(page: import("@playwright/test").Page) {
  return page.evaluate((rootSelector) => {
    const base = document.querySelector(rootSelector)!.getBoundingClientRect();
    const lines: string[] = [];
    const walk = (element: Element, depth: number) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const moving = [
        ["transform", "none"],
        ["translate", "none"],
        ["scale", "none"],
        ["opacity", "1"],
      ]
        .filter(
          ([property, rest]) => style.getPropertyValue(property!) !== rest
        )
        .map(
          ([property]) => `${property}: ${style.getPropertyValue(property!)}`
        );
      const animations = element
        .getAnimations()
        .map(
          (animation) =>
            `${(animation as CSSAnimation).animationName ?? "animation"}@${Math.round(Number(animation.currentTime))}ms ${animation.playState}`
        );
      const component = element.getAttribute("data-component");
      const x = (n: number) => Math.round((n - base.left) * 10) / 10;
      const y = (n: number) => Math.round((n - base.top) * 10) / 10;
      lines.push(
        [
          `${"  ".repeat(depth)}<${element.tagName.toLowerCase()}${component ? ` ${component}` : ""}>`,
          `x ${x(box.left)}–${x(box.right)}, y ${y(box.top)}–${y(box.bottom)}`,
          ...moving,
          ...(animations.length
            ? [`animations: ${animations.join(", ")}`]
            : []),
        ].join("  ")
      );
      for (const child of element.children) walk(child, depth + 1);
    };
    for (const child of document.querySelector(rootSelector)!.children) {
      walk(child, 0);
    }
    return lines.join("\n");
  }, root);
}
