import { readFile } from "node:fs/promises";
import { compile } from "tailwindcss";
import { beforeAll, describe, expect, it } from "vitest";
import { build, readSources, type Built } from "./build.ts";
import { tokenNames } from "./naming.ts";

const tokensDir = `${import.meta.dirname}/`;

let built: Built;

beforeAll(async () => {
  const result = build(await readSources(tokensDir));
  if (!result.ok) throw new Error(JSON.stringify(result.failures, null, 2));
  built = result;
});

it("builds tokens.css and tokens.ts from the committed sources", () => {
  expect(built.css).toMatchSnapshot();
  expect(built.ts).toMatchSnapshot();
});

it("leaves the committed outputs as a fresh build writes them", async () => {
  expect(await readFile(`${tokensDir}tokens.css`, "utf8")).toBe(built.css);
  expect(await readFile(`${tokensDir}tokens.ts`, "utf8")).toBe(built.ts);
});

describe("the naming chain", () => {
  // One token per family, as ADR 0005 spells the chain out.
  const examples: [path: string, mode: string][] = [
    ["color.bg.surface", '[data-theme="dark"]'],
    ["color.text.ink-muted", '[data-theme="dark"]'],
    ["color.border.control", '[data-theme="dark"]'],
    ["color.ring.focus", '[data-theme="dark"]'],
    ["shadow.raised", '[data-theme="dark"]'],
    ["space.sm", ":root"],
    ["radius.control", ":root"],
    ["density.padding.page", '[data-density="contractor"]'],
    ["density.height.control", '[data-density="contractor"]'],
    ["density.min-height.target", '[data-density="contractor"]'],
    ["density.size.icon", '[data-density="contractor"]'],
    ["density.radius.surface", '[data-density="contractor"]'],
    ["density.text.body", '[data-density="contractor"]'],
    ["size.width.sheet", ":root"],
    ["type.title", ":root"],
    ["type.family.sans", ":root"],
    ["motion.duration.base", ":root"],
    ["motion.delay.stagger", ":root"],
    ["motion.ease.settle", ":root"],
    ["motion.animate.progress-fill", ":root"],
    ["z.toast", ":root"],
  ];

  let utilities: (className: string) => string;

  beforeAll(async () => {
    const compiler = await compile(`${built.css}\n@tailwind utilities;`, {
      base: tokensDir,
    });
    utilities = (className) => compiler.build([className]);
  });

  it.each(examples)("holds for %s", (path, mode) => {
    const names = tokenNames(path);
    // Typography is one token with a --ds-* variable per sub-value.
    const cssVar =
      names.family === "text" ? `${names.cssVar}-font-size` : names.cssVar;

    expect(blockOf(built.css, mode)).toContain(`${cssVar}:`);
    expect(utilities(names.className!)).toContain(`var(${cssVar})`);
    expect(built.ts).toMatch(
      new RegExp(`export const ${names.family} = \\[[^\\]]*"${names.role}"`)
    );
  });

  it("keeps font weight as one of two shared variables (ADR 0007)", () => {
    expect(blockOf(built.css, ":root")).toContain(
      "--ds-type-title-font-weight: var(--ds-type-weight-semibold);"
    );
    expect(blockOf(built.css, '[data-density="contractor"]')).toContain(
      "--ds-density-text-body-font-weight: var(--ds-type-weight-regular);"
    );
  });

  it("compiles nothing outside the tokens", () => {
    for (const className of [
      "bg-ink",
      "text-page",
      "p-4",
      "rounded-lg",
      "font-bold",
    ]) {
      expect(utilities(className)).not.toContain(`.${className}`);
    }
  });
});

function blockOf(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `no ${selector} block`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}
