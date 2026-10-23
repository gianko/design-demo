// `pnpm gate [<Component|screen>] [--update]` (ADR 0006, ADR 0009). It runs
// ESLint (gate 2 and the static taste rules), tsc (gate 3) and the Storybook
// build on the host, then the Playwright pass inside the pinned image, so
// every baseline comes from one renderer. What it may do to baselines is
// baselineMode's call.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { baselineMode, type BaselineMode } from "./baseline-mode.ts";
import { playwrightInImage } from "./image.ts";

const repo = resolve(import.meta.dirname, "..");

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { update: { type: "boolean", default: false } },
});
if (positionals.length > 1) {
  fail("Usage: pnpm gate [<Component|screen>] [--update]");
}
const [target] = positionals;
const ci = Boolean(process.env.CI);
let mode: BaselineMode;
try {
  mode = baselineMode({ update: values.update, ci });
} catch (error) {
  fail((error as Error).message);
}

run("pnpm", ["lint"]);
run("pnpm", ["typecheck"]);
run("pnpm", ["storybook:build", "--quiet"]);
run(
  "docker",
  playwrightInImage(
    "gates/playwright.config.ts",
    [`--update-snapshots=${mode}`],
    {
      CI: ci ? "1" : undefined,
      GATE_TARGET: target,
      GATE_BASELINES: process.env.GATE_BASELINES || undefined,
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
