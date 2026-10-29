// Writes the figma:sync-components script of ADR 0015: the library's
// component frames, generated from each component's tv() config by
// frames.ts, wrapped in the fixed runtime beside this file, as one Plugin API
// script the agent passes to use_figma verbatim. It runs after
// figma:sync-tokens, whose variables and styles it binds to. Run it with
// `pnpm figma:sync-components`; `--dry-run` returns the diff instead of
// writing, `--prune <id,…>` also deletes those orphans, and `--split` writes
// one script per component set.

import { fileURLToPath } from "node:url";
import { frameSources } from "./components.ts";
import { framesPayload, readTokens, type ComponentsPayload } from "./frames.ts";
import {
  embeddedRuntime,
  overLimit,
  pruneArg,
  syncScript,
  writeScripts,
  type Script,
} from "./scripts.ts";

export type SyncOptions = {
  dryRun: boolean;
  prune?: string[];
  split?: boolean;
};

const runtime = await embeddedRuntime("sync-core.js", "components-runtime.js");

function script(payload: ComponentsPayload, options: SyncOptions): string {
  return syncScript({
    command: "figma:sync-components",
    source: "figma/sync-components.ts from each component's tv() config",
    run: { dryRun: options.dryRun, prune: options.prune ?? [] },
    payload,
    runtime,
    call: "syncComponents",
  });
}

/** The scripts to run in order: one, or with `split`, one per component set. */
export function syncComponentScripts(
  payload: ComponentsPayload,
  options: SyncOptions
): Script[] {
  if (!options.split) return [{ name: "all", code: script(payload, options) }];
  if (options.prune?.length) {
    throw new Error(
      "--prune needs the whole payload in one script; drop --split"
    );
  }
  return payload.sets.map((set) => ({
    name: set.name.toLowerCase(),
    code: script({ ...payload, sets: [set] }, options),
  }));
}

// ── CLI ───────────────────────────────────────────────────────────────────

async function main(args: string[]): Promise<number> {
  const prune = pruneArg(args);
  if (!prune) {
    console.error(
      "figma:sync-components: --prune takes a comma-separated list of IDs"
    );
    return 1;
  }
  const options: SyncOptions = {
    dryRun: args.includes("--dry-run"),
    prune,
    split: args.includes("--split"),
  };
  let scripts: Script[];
  try {
    const payload = framesPayload(frameSources, await readTokens());
    scripts = syncComponentScripts(payload, options);
  } catch (error) {
    console.error(`figma:sync-components: ${(error as Error).message}`);
    return 1;
  }
  const over = overLimit(
    "figma:sync-components",
    scripts,
    Boolean(options.split)
  );
  if (over) {
    console.error(over);
    return 1;
  }
  await writeScripts("sync-components", options.dryRun, scripts);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
