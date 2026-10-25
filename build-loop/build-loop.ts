// `pnpm build-loop [--dry-run]`: the build loop (spec § Build-loop driver).
// Each iteration takes the first open, unblocked `build-loop` issue, builds its
// component in one headless `/build-component` session, files the session's
// gaps and opens the PR; it stops when no `build-loop` issue is unblocked, and
// fails if a claimed one has no PR, as a failed step after a session leaves it.
// `--dry-run` prints the issue it would take, and writes nothing.

import { parseArgs } from "node:util";
import { drive } from "./driver.ts";
import { gh, githubTracker } from "./github.ts";
import { sessionBuilder } from "./launch.ts";
import { repo as root } from "../repo.ts";

const { values } = parseArgs({
  options: { "dry-run": { type: "boolean", default: false } },
});

try {
  const repo = gh([
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "--jq",
    ".nameWithOwner",
  ]).trim();
  drive(
    {
      tracker: githubTracker(gh, repo),
      builder: sessionBuilder(root, console.log),
      log: console.log,
    },
    { dryRun: values["dry-run"] }
  );
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
