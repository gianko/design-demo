// The headless `/build-component <Component>` session, isolated as ADR 0006
// sets out: project settings only (a user-level hook leaked into the
// prototype's first run), so `frontend-design` is its only plugin; edits
// accepted; Bash limited to pnpm and npx; and a transcript kept outside the
// working tree.

import { join, relative } from "node:path";

export function sessionArgs(component: string): string[] {
  return [
    "-p",
    `/build-component ${component}`,
    "--setting-sources",
    "project",
    // Account connectors (claude.ai Docs and the like) load even with project
    // settings only, and their output lands outside the repo, where no gate
    // sees it.
    "--strict-mcp-config",
    "--permission-mode",
    "acceptEdits",
    "--allowedTools",
    "Bash(pnpm *)",
    "Bash(npx *)",
    "--output-format",
    "stream-json",
    "--verbose",
  ];
}

// Where the session's stream-json transcript goes: under the XDG state home,
// never inside the session's working tree, where the session could read it
// and git would pick it up.
export function transcriptPath(
  component: string,
  {
    worktree,
    stateHome,
    now,
  }: { worktree: string; stateHome: string; now: Date }
): string {
  const stamp = now.toISOString().replace(/[-:]|\.\d+/g, "");
  const path = join(
    stateHome,
    "design-demo",
    "runs",
    `${component}-${stamp}.jsonl`
  );
  if (!relative(worktree, path).startsWith("..")) {
    throw new Error(
      `The transcript must be written outside the working tree, but ${path} is inside ${worktree}.`
    );
  }
  return path;
}
