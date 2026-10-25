// Writes the figma:walk-capture script of ADR 0007: a read-only walk of the
// captured frames' boundVariables, wrapped around the fixed runtime beside
// this file, for the agent to pass to use_figma verbatim. Run it with
// `pnpm figma:walk-capture <node-id>,<node-id>`.
//
// It carries no checksum, unlike the sync: it only reads, so a mistyped byte
// can cost a wrong report, never a wrong write, and a wrong ID throws.

import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { repo } from "../repo.ts";
import { embeddedRuntime, outDir } from "./scripts.ts";

const runtime = await embeddedRuntime("walk-runtime.js");

/** The walk of the frames `ids` names: one read-only Plugin API script. */
export function walkScript(ids: string[]): string {
  return [
    "// figma:walk-capture, written by figma/walk-capture.ts (ADR 0007). It only reads.",
    `const IDS = ${JSON.stringify(ids)};`,
    runtime,
    "return await walkCapture(IDS);",
    "",
  ].join("\n");
}

// ── CLI ───────────────────────────────────────────────────────────────────

async function main(args: string[]): Promise<number> {
  // Figma URLs write node IDs with a dash; the Plugin API takes a colon.
  const ids = (args[0] ?? "")
    .split(",")
    .filter(Boolean)
    .map((id) => id.replace("-", ":"));
  if (!ids.length) {
    console.error(
      "figma:walk-capture: pass the captured frames' node IDs, comma-separated"
    );
    return 1;
  }
  await mkdir(outDir, { recursive: true });
  const file = join(outDir, "walk-capture.js");
  const code = walkScript(ids);
  await writeFile(file, code);
  console.log(`${relative(repo, file)}  ${code.length} chars`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
