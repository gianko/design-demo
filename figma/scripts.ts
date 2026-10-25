// What every generated Plugin API script of ADR 0007 shares: where it's
// written for the agent to read, and how its fixed runtime is embedded.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { transform } from "esbuild";
import { repo } from "../repo.ts";

/** Where the scripts are written; the agent reads them from here. */
export const outDir = join(repo, "figma", "out");

/**
 * A runtime beside this file, without its comments and indentation: the agent
 * re-types every byte into use_figma. Names stay, so its errors still read.
 */
export async function embeddedRuntime(file: string): Promise<string> {
  const source = await readFile(join(import.meta.dirname, file), "utf8");
  const { code } = await transform(source, { minifyWhitespace: true });
  return code.trimEnd();
}
