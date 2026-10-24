// Writes the figma:sync-tokens script of ADR 0007: tokens/figma.json wrapped in
// the fixed runtime beside this file, as one Plugin API script the agent passes
// to use_figma verbatim. Run it with `pnpm figma:sync-tokens`; `--dry-run`
// returns the diff instead of writing, `--prune <id,…>` also deletes those
// orphans, and `--split` writes one script per collection, then one for styles.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import { repo } from "../repo.ts";
import { figmaPayloadFile, type FigmaPayload } from "../tokens/build.ts";

/** use_figma's maxLength for `code`. */
export const codeLimit = 50_000;

export type SyncOptions = {
  dryRun: boolean;
  prune?: string[];
  split?: boolean;
};
export type Script = { name: string; code: string };

// The agent re-types every byte into use_figma, so the runtime goes in without
// its comments and indentation. Names stay, so its errors still read.
const { code: runtime } = await transform(
  await readFile(join(import.meta.dirname, "sync-runtime.js"), "utf8"),
  { minifyWhitespace: true }
);

// The runtime's own copy hashes the data the same way.
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

type Part = Partial<Pick<FigmaPayload, "textStyles" | "effectStyles">> & {
  /** Every collection the sync owns, so aliases resolve across split scripts. */
  collectionNames: string[];
  collections: FigmaPayload["collections"];
};

function script(part: Part, options: SyncOptions): string {
  const run = { dryRun: options.dryRun, prune: options.prune ?? [] };
  return [
    `// figma:sync-tokens${run.dryRun ? " --dry-run" : ""}, written by figma/sync-tokens.ts from tokens/${figmaPayloadFile} (ADR 0007).`,
    "// Pass it to use_figma verbatim: a changed byte of its data makes it throw, writing nothing.",
    `const RUN = ${JSON.stringify(run)};`,
    `const PAYLOAD = ${JSON.stringify(part)};`,
    `const CHECKSUM = "${fnv1a(JSON.stringify([run, part]))}";`,
    runtime.trimEnd(),
    "return await syncTokens(RUN, PAYLOAD, CHECKSUM);",
    "",
  ].join("\n");
}

/** The scripts to run in order: one, or with `split`, one per collection and one for styles. */
export function syncScripts(
  payload: FigmaPayload,
  options: SyncOptions
): Script[] {
  const collectionNames = payload.collections.map(({ name }) => name);
  if (!options.split) {
    return [
      { name: "all", code: script({ collectionNames, ...payload }, options) },
    ];
  }
  if (options.prune?.length) {
    throw new Error(
      "--prune needs the whole payload in one script; drop --split"
    );
  }
  // Primitives come first, so the collections that alias them find them.
  return [
    ...payload.collections.map((collection) => ({
      name: collection.name.toLowerCase(),
      code: script({ collectionNames, collections: [collection] }, options),
    })),
    {
      name: "styles",
      code: script(
        {
          collectionNames,
          collections: [],
          textStyles: payload.textStyles,
          effectStyles: payload.effectStyles,
        },
        options
      ),
    },
  ];
}

// ── CLI ───────────────────────────────────────────────────────────────────

/** Where the scripts are written; the agent reads them from here. */
export const outDir = join(repo, "figma", "out");

async function main(args: string[]): Promise<number> {
  const prune = args.includes("--prune")
    ? (args[args.indexOf("--prune") + 1] ?? "").split(",").filter(Boolean)
    : [];
  const options: SyncOptions = {
    dryRun: args.includes("--dry-run"),
    prune,
    split: args.includes("--split"),
  };
  if (args.includes("--prune") && !prune.length) {
    console.error(
      "figma:sync-tokens: --prune takes a comma-separated list of IDs"
    );
    return 1;
  }
  const payload = JSON.parse(
    await readFile(join(repo, "tokens", figmaPayloadFile), "utf8")
  ) as FigmaPayload;

  let scripts: Script[];
  try {
    scripts = syncScripts(payload, options);
  } catch (error) {
    console.error(`figma:sync-tokens: ${(error as Error).message}`);
    return 1;
  }
  const over = scripts.filter(({ code }) => code.length > codeLimit);
  if (over.length) {
    console.error(
      `figma:sync-tokens: ${over.map(({ name, code }) => `${name} is ${code.length} chars`).join(", ")}, over use_figma's ${codeLimit}-char limit.${options.split ? "" : " Rerun with --split, which gives up the one-call rollback."}`
    );
    return 1;
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const mode = options.dryRun ? "dry-run" : "apply";
  for (const [index, { name, code }] of scripts.entries()) {
    const file = join(
      outDir,
      scripts.length === 1
        ? `sync-tokens.${mode}.js`
        : `sync-tokens.${mode}.${index + 1}-${name}.js`
    );
    await writeFile(file, code);
    console.log(`${relative(repo, file)}  ${code.length} chars`);
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
