// `pnpm gate [<Component|screen>...] [--update]` (ADR 0006, ADR 0009). It runs
// ESLint (gate 2 and the static taste rules), tsc (gate 3) and the Storybook
// build on the host, then the Playwright pass inside the pinned image, so
// every baseline comes from one renderer. What it may do to baselines is
// baselineMode's call.

import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { baselineMode, type BaselineMode } from "./baseline-mode.ts";
import { playwrightInImage } from "./image.ts";
import { targetsEnv } from "./stories.ts";
import { repo } from "../repo.ts";

const { positionals: targets, values } = parseArgs({
  allowPositionals: true,
  options: { update: { type: "boolean", default: false } },
});
const ci = Boolean(process.env.CI);
let mode: BaselineMode;
try {
  mode = baselineMode({ update: values.update, ci });
} catch (error) {
  fail((error as Error).message);
}

run("pnpm", ["lint"]);
run("pnpm", ["typecheck"]);
// The script sets NODE_ENV=production, so the build bundles React's
// production build whatever the caller's NODE_ENV: gate.e2e.ts runs this
// under vitest, where it's `test`, and React's development build logs
// warnings, script-errors that no real render logs.
run("pnpm", ["storybook:build", "--quiet"]);
run(
  "docker",
  playwrightInImage(
    "gates/playwright.config.ts",
    [`--update-snapshots=${mode}`],
    {
      CI: ci ? "1" : undefined,
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
