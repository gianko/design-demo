// `pnpm tokens:paint` (#273): paints every colour value the token build gives
// Figma in the pinned Playwright image (ADR 0009), the renderer `pnpm gate`
// uses, and writes the painted-colour snapshot, tokens/painted.json, which the
// build takes Figma's RGB from. Run it by hand after changing a colour:
// `pnpm tokens` fails on a colour the snapshot doesn't hold, and
// `pnpm test:gate` re-paints every colour and fails on any that drifted, as
// a Playwright bump could make one.

import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { nodeInImage } from "../gates/image.ts";
import { repo } from "../repo.ts";
import {
  figmaColors,
  paintedFile,
  readSources,
  type Painted,
  type Sources,
} from "./build.ts";

const tokensDir = import.meta.dirname;

/** Paints CSS colours in the pinned image, as 8-bit sRGB. */
export function paint(colors: string[]): Painted {
  const { status, stdout, stderr, error } = spawnSync(
    "docker",
    nodeInImage([
      relative(repo, join(tokensDir, "paint-in-image.ts")),
      JSON.stringify(colors),
    ]),
    { cwd: repo, encoding: "utf8" }
  );
  if (error) throw error;
  if (status !== 0) {
    throw new Error(
      `Painting in the pinned image failed (exit ${status}):\n${stderr}`
    );
  }
  return JSON.parse(stdout);
}

/**
 * Re-paints the colours the build gives Figma and names each one the
 * snapshot doesn't hold as painted: drifted, missing, or no longer used.
 */
export function drift(sources: Sources): string[] {
  const painted = paint(figmaColors(sources));
  const colors = new Set([
    ...Object.keys(painted),
    ...Object.keys(sources.painted),
  ]);
  return [...colors].sort().flatMap((color) => {
    const now = painted[color]?.join(",");
    const snapshot = sources.painted[color]?.join(",");
    if (now === snapshot) return [];
    if (now === undefined) {
      return [`${color} is in ${paintedFile}, but no colour uses it`];
    }
    return [
      `${color} paints ${now}, but ${paintedFile} has ${snapshot ?? "no entry"}`,
    ];
  });
}

/** The snapshot's file, one colour per line, sorted, as Prettier formats it. */
function formatPainted(painted: Painted): string {
  const lines = Object.keys(painted)
    .sort()
    .map(
      (color) => `  ${JSON.stringify(color)}: [${painted[color]!.join(", ")}]`
    );
  return `{\n${lines.join(",\n")}\n}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const painted = paint(figmaColors(await readSources(tokensDir)));
  await writeFile(join(tokensDir, paintedFile), formatPainted(painted));
  console.log(
    `tokens:paint: wrote ${Object.keys(painted).length} painted colours to tokens/${paintedFile}`
  );
}
