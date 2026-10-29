// What every generated Plugin API script of ADR 0007 shares: where it's
// written for the agent to read, how its fixed runtime is embedded, and, for
// a sync, how its data is wrapped with the checksum the runtime checks.

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { transform } from "esbuild";
import { repo } from "../repo.ts";

/** Where the scripts are written; the agent reads them from here. */
export const outDir = join(repo, "figma", "out");

/** use_figma's maxLength for `code`. */
export const codeLimit = 50_000;

export type Script = { name: string; code: string };

/**
 * Runtimes beside this file, in order, without their comments and
 * indentation: the agent re-types every byte into use_figma. Names stay, so
 * their errors still read.
 */
export async function embeddedRuntime(...files: string[]): Promise<string> {
  const parts: string[] = [];
  for (const file of files) {
    const source = await readFile(join(import.meta.dirname, file), "utf8");
    const { code } = await transform(source, { minifyWhitespace: true });
    parts.push(code.trimEnd());
  }
  return parts.join("\n");
}

// sync-core.js's copy hashes the data the same way.
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export type SyncRun = { dryRun: boolean; prune: string[] };

/**
 * JSON with every non-ASCII character escaped. The agent re-types the
 * script, and a character it can't see, like the no-break space in an
 * Amount, would come back as a plain space and fail the checksum. The
 * escape parses to the same string, so the checksum doesn't change.
 */
function ascii(json: string): string {
  return json.replace(
    /[^\x20-\x7e]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}

/**
 * One sync script: RUN and PAYLOAD as literals, the checksum of both, the
 * runtime, and the call that returns its report.
 */
export function syncScript({
  command,
  source,
  run,
  payload,
  runtime,
  call,
}: {
  command: string;
  /** What the data was written from, for the header. */
  source: string;
  run: SyncRun;
  payload: unknown;
  runtime: string;
  /** The runtime's entry point, called with RUN, PAYLOAD and CHECKSUM. */
  call: string;
}): string {
  return [
    `// ${command}${run.dryRun ? " --dry-run" : ""}, written by ${source} (ADR 0007).`,
    "// Pass it to use_figma verbatim: a changed byte of its data makes it throw, writing nothing.",
    `const RUN = ${JSON.stringify(run)};`,
    `const PAYLOAD = ${ascii(JSON.stringify(payload))};`,
    `const CHECKSUM = "${fnv1a(JSON.stringify([run, payload]))}";`,
    runtime,
    `return await ${call}(RUN, PAYLOAD, CHECKSUM);`,
    "",
  ].join("\n");
}

/** The over-limit error for `scripts`, or null when each fits one call. */
export function overLimit(
  command: string,
  scripts: Script[],
  split: boolean
): string | null {
  const over = scripts.filter(({ code }) => code.length > codeLimit);
  if (!over.length) return null;
  return `${command}: ${over.map(({ name, code }) => `${name} is ${code.length} chars`).join(", ")}, over use_figma's ${codeLimit}-char limit.${split ? "" : " Rerun with --split, which gives up the one-call rollback."}`;
}

/**
 * Writes `scripts` as `<prefix>.<mode>.js`, or numbered parts, after
 * removing every earlier `<prefix>.*` file, so a split run leaves no stale
 * part behind; the other scripts sharing the directory stay.
 */
export async function writeScripts(
  prefix: string,
  dryRun: boolean,
  scripts: Script[]
): Promise<void> {
  await mkdir(outDir, { recursive: true });
  for (const stale of await readdir(outDir)) {
    if (stale.startsWith(`${prefix}.`)) await rm(join(outDir, stale));
  }
  const mode = dryRun ? "dry-run" : "apply";
  for (const [index, { name, code }] of scripts.entries()) {
    const file = join(
      outDir,
      scripts.length === 1
        ? `${prefix}.${mode}.js`
        : `${prefix}.${mode}.${index + 1}-${name}.js`
    );
    await writeFile(file, code);
    console.log(`${relative(repo, file)}  ${code.length} chars`);
  }
}

/** `--prune <id,…>`'s IDs, or null when the flag is there without any. */
export function pruneArg(args: string[]): string[] | null {
  if (!args.includes("--prune")) return [];
  const ids = (args[args.indexOf("--prune") + 1] ?? "")
    .split(",")
    .filter(Boolean);
  return ids.length ? ids : null;
}
