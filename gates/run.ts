// `pnpm gate [<Component|screen>...] [--update]` (ADR 0006, ADR 0009). It runs
// ESLint (gate 2 and the static taste rules), tsc (gate 3) and the Storybook
// build on the host, then the Playwright pass inside the pinned image, so
// every baseline comes from one renderer. What it may do to baselines is
// baselineMode's call.
//
// CI splits it over jobs: `--shard=<n>/<count>` runs one share of the
// Playwright pass alone, over the Storybook another job built, and writes a
// blob report. `pnpm gate:merge` makes one report of the shards' blobs.

import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { baselineMode, type BaselineMode } from "./baseline-mode.ts";
import { playwrightInImage } from "./image.ts";
import { targetsEnv } from "./stories.ts";
import { repo } from "../repo.ts";

const { positionals: targets, values } = parseArgs({
  allowPositionals: true,
  options: {
    update: { type: "boolean", default: false },
    shard: { type: "string" },
  },
});
const ci = Boolean(process.env.CI);
let mode: BaselineMode;
try {
  mode = baselineMode({ update: values.update, ci });
} catch (error) {
  fail((error as Error).message);
}

const { shard } = values;
if (!shard) {
  run("pnpm", ["lint"]);
  run("pnpm", ["typecheck"]);
}
// The script sets NODE_ENV=production, so the build bundles React's
// production build whatever the caller's NODE_ENV: gate.e2e.ts runs this
// under vitest, where it's `test`, and React's development build logs
// warnings, script-errors that no real render logs.
if (!shard) run("pnpm", ["storybook:build", "--quiet"]);
run(
  "docker",
  playwrightInImage(
    "gates/playwright.config.ts",
    [`--update-snapshots=${mode}`, ...(shard ? [`--shard=${shard}`] : [])],
    {
      CI: ci ? "1" : undefined,
      GATE_SHARD: shard,
      GATE_WORKERS: process.env.GITHUB_ACTIONS ? "3" : undefined,
      GATE_TARGETS: targetsEnv.write(targets),
      GATE_BASELINES: process.env.GATE_BASELINES || undefined,
      GATE_SEED: process.env.GATE_SEED || undefined,
    }
  )
);

function run(command: string, args: string[]) {
  const { status, error } = spawnSync(command, args, {
    cwd: repo,
    stdio: "inherit",
  });
  if (error) fail(`${command}: ${error.message}`);
  if (status !== 0) process.exit(status ?? 1);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
