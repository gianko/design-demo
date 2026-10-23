// One isolated, headless `/build-component` session (ADR 0006). It runs in a
// fresh worktree of origin/main on its own branch, since other sessions share
// the main checkout, and leaves the work there uncommitted for the PR.

import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { type Build, type Builder, gapsPath, type Log } from "./driver.ts";
import { sessionArgs, summarise, transcriptPath } from "./session.ts";

export type Session = Build & { status: number };

export function launch(component: string, repo: string, log: Log): Session {
  if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) {
    throw new Error(
      "Docker isn't running. `pnpm gate` renders in it (ADR 0009), so no gate run in the session could pass."
    );
  }

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

  log(`Session: /build-component ${component}`);
  log(`Worktree: ${worktree} (branch ${branch})`);
  log(`Transcript: ${transcript}`);

  const out = openSync(transcript, "w");
  const session = spawnSync("claude", sessionArgs(component), {
    cwd: worktree,
    stdio: ["ignore", out, "inherit"],
  });
  closeSync(out);
  if (session.error) throw new Error(`claude: ${session.error.message}`);

  const gaps = resolve(worktree, gapsPath(component));
  const status = session.status ?? 1;
  return {
    branch,
    worktree,
    status,
    ok: status === 0,
    summary: summarise(readFileSync(transcript, "utf8")),
    gaps: existsSync(gaps) ? readFileSync(gaps, "utf8") : undefined,
  };
}

// The build loop's Builder: a launched session, then its work committed and
// its branch pushed for the PR.
export function sessionBuilder(repo: string, log: Log): Builder {
  return {
    build: (component) => launch(component, repo, log),
    push({ worktree, branch }, message) {
      run("git", ["add", "--all"], worktree);
      run("git", ["commit", "--message", message], worktree);
      run("git", ["push", "--set-upstream", "origin", branch], worktree);
    },
  };
}

function run(command: string, args: string[], cwd: string) {
  const { status, error } = spawnSync(command, args, {
    cwd,
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (error) throw new Error(`${command}: ${error.message}`);
  if (status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${status}`);
  }
}
