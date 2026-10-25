import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mainCheckout, pruneMerged } from "./launch.ts";

// A real origin and main checkout in a temporary directory, since these talk
// to git and nothing else. A git hook (the pre-commit run of these tests)
// exports GIT_DIR, GIT_INDEX_FILE and others; inherited, they would point
// every git call here, and in the code under test, at the repo being
// committed to.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("GIT_")) delete process.env[name];
}

let root: string;
let main: string;

const git = (args: string[], cwd = main) =>
  execFileSync(
    "git",
    [
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@t",
      "-c",
      "core.hooksPath=/dev/null",
      ...args,
    ],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );

// A session worktree on its own branch from origin/main, with one commit.
function session(name: string): string {
  const path = join(main, ".claude/worktrees", name);
  git(["worktree", "add", "-b", name, path, "origin/main"]);
  writeFileSync(join(path, `${name}.txt`), name);
  git(["add", "--all"], path);
  git(["commit", "--message", name], path);
  return path;
}

// Merges a session's branch into origin/main, as its PR would.
function merge(branch: string) {
  git(["merge", "--no-ff", "--message", `Merge ${branch}`, branch]);
  git(["push", "origin", "main"]);
}

const worktrees = () =>
  git(["worktree", "list", "--porcelain"])
    .split("\n")
    .filter((line) => line.startsWith("branch "))
    .map((line) => line.replace("branch refs/heads/", ""));

const branches = () =>
  git(["branch", "--format=%(refname:short)"]).trim().split("\n");

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "launch-test-")));
  main = join(root, "main");
  git(
    ["init", "--bare", "--initial-branch=main", join(root, "origin.git")],
    root
  );
  git(["clone", join(root, "origin.git"), main], root);
  git(["commit", "--allow-empty", "--message", "init"]);
  git(["push", "origin", "main"]);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("mainCheckout", () => {
  test("is the main checkout from the main checkout and from a worktree of it", () => {
    const worktree = session("build-component-text");

    expect(mainCheckout(main)).toBe(main);
    expect(mainCheckout(worktree)).toBe(main);
  });
});

describe("pruneMerged", () => {
  test("removes a merged session worktree and its branch, and keeps the rest", () => {
    session("build-component-text");
    session("build-component-stack");
    const dirty = session("build-component-card");
    const locked = session("build-component-heading");
    session("feature-merged");
    for (const branch of [
      "build-component-text",
      "build-component-card",
      "build-component-heading",
      "feature-merged",
    ]) {
      merge(branch);
    }
    writeFileSync(join(dirty, "draft.txt"), "unsaved");
    git(["worktree", "lock", locked]);
    git(["fetch", "origin", "main"]);
    const log: string[] = [];

    pruneMerged(main, (line) => log.push(line));

    // Git lists worktrees by path.
    expect(worktrees()).toEqual([
      "main",
      "build-component-card",
      "build-component-heading",
      "build-component-stack",
      "feature-merged",
    ]);
    expect(branches()).not.toContain("build-component-text");
    expect(log).toEqual([
      `Kept ${dirty}: its branch is merged, but it has uncommitted work.`,
      `Removed ${join(main, ".claude/worktrees/build-component-text")}: its branch is merged.`,
    ]);
  });
});
