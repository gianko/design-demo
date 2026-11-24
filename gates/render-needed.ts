// Whether a pull request could change a render, for CI to skip the Playwright
// pass when it couldn't (ADR 0009). Two checks, and both must say no:
//
//   node gates/render-needed.ts paths <file>            `git diff --name-only`'s output
//   node gates/render-needed.ts builds <before> <after> two Storybook builds
//
// The paths are not enough: Tailwind reads class names from every file in the
// repo, so words in docs/ can reach the built CSS. The builds are not enough
// either: the pass, its rules and its baselines are outside them. Each prints
// `needed=true` or `needed=false`, as a step output.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// What neither the pass nor its baselines read. A path that isn't listed
// needs a render, so a new folder is gated until someone lists it.
const notRead = [
  /^(?:\.agents|\.claude|\.out-of-scope|\.scratch|build-loop|docs|evals|figma|generator|video)\//,
  /^[^/]+\.md$/,
];

export function pathsNeedRender(paths: string[]): boolean {
  return (
    paths.length === 0 ||
    paths.some((path) => !notRead.some((pattern) => pattern.test(path)))
  );
}

// Storybook's own metadata, which holds the time of the build. Nothing a
// story renders loads it.
const metadata = "project.json";

export function buildsDiffer(before: string, after: string): boolean {
  const [a, b] = [before, after].map((dir) =>
    readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name).slice(dir.length + 1))
      .filter((file) => file !== metadata)
      .toSorted()
  ) as [string[], string[]];
  if (a.length === 0) throw new Error(`No build in ${before}.`);
  return (
    a.join("\n") !== b.join("\n") ||
    a.some(
      (file) =>
        !readFileSync(join(before, file)).equals(
          readFileSync(join(after, file))
        )
    )
  );
}

if (process.argv[1] === import.meta.filename) {
  const [check, first, second] = process.argv.slice(2);
  if (check === "paths" && first) {
    const paths = readFileSync(first, "utf8").split("\n").filter(Boolean);
    console.log(`needed=${pathsNeedRender(paths)}`);
  } else if (check === "builds" && first && second) {
    console.log(`needed=${buildsDiffer(first, second)}`);
  } else {
    throw new Error("Usage: render-needed.ts paths <file> | builds <a> <b>");
  }
}
