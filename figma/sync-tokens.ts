// Writes the figma:sync-tokens script of ADR 0007: tokens/figma.json wrapped in
// the fixed runtime beside this file, as one Plugin API script the agent passes
// to use_figma verbatim. Run it with `pnpm figma:sync-tokens`; `--dry-run`
// returns the diff instead of writing, `--prune <id,…>` also deletes those
// orphans, and `--split` writes one script per collection, then one for styles.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { repo } from "../repo.ts";
import { figmaPayloadFile, type FigmaPayload } from "../tokens/build.ts";
import {
  embeddedRuntime,
  overLimit,
  pruneArg,
  syncScript,
  writeScripts,
  type Script,
} from "./scripts.ts";

export { codeLimit, type Script } from "./scripts.ts";

export type SyncOptions = {
  dryRun: boolean;
  prune?: string[];
  split?: boolean;
};

const runtime = await embeddedRuntime("sync-core.js", "sync-runtime.js");

type Part = Partial<Pick<FigmaPayload, "textStyles" | "effectStyles">> & {
  /** Every collection the sync owns, so aliases resolve across split scripts. */
  collectionNames: string[];
  collections: FigmaPayload["collections"];
};

function script(part: Part, options: SyncOptions): string {
  return syncScript({
    command: "figma:sync-tokens",
    source: `figma/sync-tokens.ts from tokens/${figmaPayloadFile}`,
    run: { dryRun: options.dryRun, prune: options.prune ?? [] },
    payload: part,
    runtime,
    call: "syncTokens",
  });
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

async function main(args: string[]): Promise<number> {
  const prune = pruneArg(args);
  if (!prune) {
    console.error(
      "figma:sync-tokens: --prune takes a comma-separated list of IDs"
    );
    return 1;
  }
  const options: SyncOptions = {
    dryRun: args.includes("--dry-run"),
    prune,
    split: args.includes("--split"),
  };
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
  const over = overLimit("figma:sync-tokens", scripts, Boolean(options.split));
  if (over) {
    console.error(over);
    return 1;
  }
  await writeScripts("sync-tokens", options.dryRun, scripts);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
