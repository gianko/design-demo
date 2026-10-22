// `pnpm gate [<Component|screen>] [--update]` (ADR 0006, ADR 0009). It runs
// ESLint (gate 2 and the static taste rules), tsc (gate 3) and the Storybook
// build on the host, then the Playwright pass inside the pinned image, so
// every baseline comes from one renderer. What it may do to baselines is
// baselineMode's call.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { baselineMode, type BaselineMode } from "./baseline-mode.ts";

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

// The image is pinned to the installed @playwright/test, so bumping the
// package bumps the renderer with it and the two can't drift.
const { version } = JSON.parse(
  readFileSync(
    resolve(repo, "node_modules/@playwright/test/package.json"),
    "utf8"
  )
);
const image = `mcr.microsoft.com/playwright:v${version}-noble`;

run("pnpm", ["lint"]);
run("pnpm", ["typecheck"]);
run("pnpm", ["storybook:build", "--quiet"]);
run("docker", [
  "run",
  "--rm",
  "--init",
  "--ipc=host",
  // The Mac and the CI runner are both arm64; Chromium's antialiasing can
  // differ between architectures.
  "--platform=linux/arm64",
  // Files the pass writes belong to the caller, and Chromium needs a HOME.
  `--user=${process.getuid!()}:${process.getgid!()}`,
  "--env=HOME=/tmp",
  ...(ci ? ["--env=CI"] : []),
  ...(target ? [`--env=GATE_TARGET=${target}`] : []),
  ...(process.env.GATE_BASELINES
    ? [`--env=GATE_BASELINES=${process.env.GATE_BASELINES}`]
    : []),
  `--volume=${repo}:/work`,
  "--workdir=/work",
  image,
  "node",
  "node_modules/@playwright/test/cli.js",
  "test",
  "--config=gates/playwright.config.ts",
  `--update-snapshots=${mode}`,
]);

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
