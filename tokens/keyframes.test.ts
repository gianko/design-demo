import {
  copyFileSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { build } from "vite";
import { repo } from "../repo.ts";

// Each keyframe's properties, by animation and offset. `from` and `to` are 0%
// and 100%, as the minifier writes them.
function keyframeProperties(css: string): Record<string, string[]> {
  const found: Record<string, string[]> = {};
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, name, body] of source.matchAll(
    /@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g
  )) {
    for (const [, selector, declarations] of body!.matchAll(
      /([^{}]+)\{([^{}]*)\}/g
    )) {
      const offset = selector!
        .trim()
        .replace(/^from$/, "0%")
        .replace(/^to$/, "100%");
      found[`${name} ${offset}`] = declarations!
        .split(";")
        .map((declaration) => declaration.split(":")[0]!.trim())
        .filter(Boolean)
        .sort();
    }
  }
  return found;
}

// tokens/build.ts appends keyframes.css to tokens.css verbatim, but the
// production build minifies it, and the minifier may drop a declaration it
// thinks redundant: it dropped `translate: none` beside a `transform`, which
// left Button's running sweep off the edge in every built Storybook while
// dev looked right.
test("every keyframe declaration survives the production build's minifier", async () => {
  const source = readFileSync(join(repo, "tokens/keyframes.css"), "utf8");
  const dir = mkdtempSync(join(tmpdir(), "keyframes-"));
  try {
    copyFileSync(
      join(repo, "tokens/keyframes.css"),
      join(dir, "keyframes.css")
    );
    writeFileSync(
      join(dir, "index.html"),
      '<link rel="stylesheet" href="./keyframes.css">'
    );
    await build({
      root: dir,
      configFile: false,
      logLevel: "silent",
      build: { outDir: join(dir, "dist") },
    });
    const assets = join(dir, "dist/assets");
    const css = readdirSync(assets).find((file) => file.endsWith(".css"))!;
    const built = readFileSync(join(assets, css), "utf8");

    const expected = keyframeProperties(source);
    expect(Object.keys(expected).length).toBeGreaterThan(0);
    expect(keyframeProperties(built)).toEqual(expected);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("reads a dropped declaration as a difference", () => {
  expect(
    keyframeProperties(
      "@keyframes s{0%{width:100%;transform:translate(0)}to{width:1px}}"
    )
  ).not.toEqual(
    keyframeProperties(
      "@keyframes s { from { width: 100%; translate: none; transform: translateX(0) } to { width: 1px } }"
    )
  );
});
