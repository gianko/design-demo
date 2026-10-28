// One isolated, headless `/build-component` session (ADR 0006). It runs in a
// fresh worktree of origin/main on its own branch, since other sessions share
// the main checkout, and leaves the work there uncommitted for the PR. Every
// session's worktree sits under the main checkout's .claude/worktrees, even
// when the loop runs from a worktree of its own.

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

  const main = mainCheckout(repo);
  const branch = `build-component-${component.toLowerCase()}`;
  const worktree = resolve(main, ".claude/worktrees", branch);
  run("git", ["fetch", "origin", "main"], main);
  pruneMerged(main, log);
  run("git", ["worktree", "add", "-b", branch, worktree, "origin/main"], main);
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

// The main checkout of the repo `checkout` belongs to, which may be itself.
export function mainCheckout(checkout: string): string {
  return dirname(
    capture(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      checkout
    ).trim()
  );
}

// Removes each session worktree whose branch origin/main already contains,
// with its branch, so merged sessions don't pile up. One that is locked or
// holds uncommitted work stays.
export function pruneMerged(main: string, log: Log) {
  const list = capture("git", ["worktree", "list", "--porcelain"], main);
  for (const entry of list.split("\n\n")) {
    const path = /^worktree (.+)$/m.exec(entry)?.[1];
    const branch = /^branch refs\/heads\/(build-component-\S+)$/m.exec(
      entry
    )?.[1];
    if (!path || !branch || /^locked/m.test(entry)) continue;
    const merged =
      spawnSync("git", ["merge-base", "--is-ancestor", branch, "origin/main"], {
        cwd: main,
      }).status === 0;
    if (!merged) continue;
    if (capture("git", ["status", "--porcelain"], path).trim()) {
      log(`Kept ${path}: its branch is merged, but it has uncommitted work.`);
      continue;
    }
    run("git", ["worktree", "remove", path], main);
    run("git", ["branch", "--delete", "--quiet", branch], main);
    log(`Removed ${path}: its branch is merged.`);
  }
}

function capture(command: string, args: string[], cwd: string): string {
  const { status, error, stdout } = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (error) throw new Error(`${command}: ${error.message}`);
  if (status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${status}`);
  }
  return stdout;
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
