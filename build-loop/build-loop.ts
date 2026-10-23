// `pnpm build-loop [--dry-run]`: the build loop (spec § Build-loop driver).
// Each pass takes the first open, unblocked `build-loop` issue, builds its
// component in one headless `/build-component` session, files the session's
// gaps and opens the PR; it stops when no `build-loop` issue is unblocked.
// `--dry-run` prints the issue it would take, and writes nothing.

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { drive } from "./driver.ts";
import { gh, githubTracker } from "./github.ts";
import { sessionBuilder } from "./launch.ts";

const repo = resolve(import.meta.dirname, "..");

const { values } = parseArgs({
  options: { "dry-run": { type: "boolean", default: false } },
});

try {
  const name = gh([
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "--jq",
    ".nameWithOwner",
  ]).trim();
  drive(
    {
      tracker: githubTracker(gh, name),
      builder: sessionBuilder(repo, console.log),
      log: console.log,
    },
    { dryRun: values["dry-run"] }
  );
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
