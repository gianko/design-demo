// `pnpm build-component <Component>`: one isolated, headless
// `/build-component` session (ADR 0006). It runs in a fresh worktree of
// origin/main on its own branch, since other sessions share the main
// checkout, and leaves the work there uncommitted for the PR.

import { spawnSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { sessionArgs, transcriptPath } from "./session.ts";

const repo = resolve(import.meta.dirname, "..");

const [component, ...extra] = process.argv.slice(2);
if (!component || extra.length > 0 || !/^[A-Z][A-Za-z0-9]*$/.test(component)) {
  fail(
    "Usage: pnpm build-component <Component>, e.g. pnpm build-component Screen"
  );
}

// `pnpm gate` renders in Docker (ADR 0009); without it every gate run fails.
run("docker", ["info", "--format", "{{.ServerVersion}}"], repo, "ignore");

const branch = `build-component-${component.toLowerCase()}`;
const worktree = resolve(repo, ".claude/worktrees", branch);
run("git", ["fetch", "origin", "main"], repo);
run("git", ["worktree", "add", "-b", branch, worktree, "origin/main"], repo);
run("pnpm", ["install", "--frozen-lockfile"], worktree);

const transcript = transcriptPath(component, {
  worktree,
  stateHome: process.env.XDG_STATE_HOME || resolve(homedir(), ".local/state"),
  now: new Date(),
});
mkdirSync(dirname(transcript), { recursive: true });

console.log(`Session: /build-component ${component}`);
console.log(`Worktree: ${worktree} (branch ${branch})`);
console.log(`Transcript: ${transcript}`);

const out = openSync(transcript, "w");
const session = spawnSync("claude", sessionArgs(component), {
  cwd: worktree,
  stdio: ["ignore", out, "inherit"],
});
closeSync(out);
if (session.error) fail(`claude: ${session.error.message}`);

// The stream's last line is the session's result.
const last = readFileSync(transcript, "utf8").trim().split("\n").at(-1);
const result = last ? JSON.parse(last) : {};
if (result.type === "result") {
  console.log(
    `\n${result.subtype}: ${result.num_turns} turns, ${Math.round(result.duration_ms / 60000)} min, ~$${result.total_cost_usd?.toFixed(2)} (estimate)`
  );
  if (result.result) console.log(`\n${result.result}`);
}
console.log(
  `\nContact sheet: ${resolve(worktree, "gates/out/contact-sheet/index.html")}`
);
process.exit(session.status ?? 1);

function run(
  command: string,
  args: string[],
  cwd: string,
  stdout: "inherit" | "ignore" = "inherit"
) {
  const { status, error } = spawnSync(command, args, {
    cwd,
    stdio: ["ignore", stdout, "inherit"],
  });
  if (error) fail(`${command}: ${error.message}`);
  if (status !== 0) fail(`${command} ${args.join(" ")} exited ${status}.`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
