import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildsDiffer, pathsNeedRender } from "./render-needed.ts";

describe("pathsNeedRender", () => {
  it("is false when the pass reads none of the paths", () => {
    expect(
      pathsNeedRender([
        "README.md",
        "docs/adr/0009-x.md",
        "evals/results/run.json",
        "generator/keep.ts",
        "figma/sync-tokens.ts",
        ".claude/skills/triage/SKILL.md",
      ])
    ).toBe(false);
  });

  it.each([
    "src/components/Card/Card.tsx",
    ".storybook/preview.tsx",
    "gates/baselines/components-card--default--light-admin.png",
    "gates/stories.spec.ts",
    // A Markdown file the taste rules read their help from.
    "lint/taste/RULES.md",
    "tokens/tokens.css",
    "format.ts",
    "package.json",
    "pnpm-lock.yaml",
    ".node-version",
    ".github/workflows/ci.yml",
    // A skippable folder's name, elsewhere in the path or as a prefix.
    "src/docs/Intro.tsx",
    "docs-site/index.tsx",
    "a-new-folder/x.ts",
  ])("is true for %s among skippable paths", (path) => {
    expect(pathsNeedRender(["docs/spec.md", path, "README.md"])).toBe(true);
  });

  // An empty diff says nothing about what changed.
  it("is true for no paths", () => {
    expect(pathsNeedRender([])).toBe(true);
  });
});

describe("buildsDiffer", () => {
  let dir: string;
  let before: string;
  let after: string;

  const build = (at: string, files: Record<string, string>) => {
    mkdirSync(join(at, "assets"), { recursive: true });
    for (const [file, content] of Object.entries(files)) {
      writeFileSync(join(at, file), content);
    }
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "render-needed-"));
    before = join(dir, "before");
    after = join(dir, "after");
    const files = { "index.json": "{}", "assets/a.css": ".mt-4{}" };
    build(before, { ...files, "project.json": "1" });
    build(after, { ...files, "project.json": "2" });
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("is false when only the build's own metadata differs", () => {
    expect(buildsDiffer(before, after)).toBe(false);
  });

  it("is true when a nested file differs", () => {
    build(after, { "assets/a.css": ".mt-5{}" });
    expect(buildsDiffer(before, after)).toBe(true);
  });

  it("is true when either build has a file the other lacks", () => {
    build(after, { "assets/b.js": "" });
    expect(buildsDiffer(before, after)).toBe(true);
    expect(buildsDiffer(after, before)).toBe(true);
  });

  it("throws when there is no build to compare", () => {
    mkdirSync(join(dir, "empty"));
    expect(() => buildsDiffer(join(dir, "empty"), after)).toThrow("No build");
  });

  it("prints the step output CI reads", () => {
    const { stdout } = spawnSync(
      "node",
      [join(import.meta.dirname, "render-needed.ts"), "builds", before, after],
      { encoding: "utf8" }
    );
    expect(stdout).toBe("needed=false\n");
  });
});
