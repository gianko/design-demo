// The headless `/build-component <Component>` session, isolated as ADR 0006
// sets out. Project settings only, since a user-level hook leaked into the
// prototype's first run; they make `frontend-design` its only plugin.

import { join, relative, sep } from "node:path";

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
  if (relative(worktree, path).split(sep)[0] !== "..") {
    throw new Error(
      `The transcript must be written outside the working tree, but ${path} is inside ${worktree}.`
    );
  }
  return path;
}

// One line for the human from the transcript's last line, the session's
// result. A session that dies mid-write leaves no result line to read.
export function summarise(transcript: string): string {
  const last = transcript.trim().split("\n").at(-1) ?? "";
  let result;
  try {
    result = JSON.parse(last);
  } catch {
    result = undefined;
  }
  if (result?.type !== "result") return "The session ended without a result.";
  const minutes = Math.round(result.duration_ms / 60000);
  const cost = result.total_cost_usd.toFixed(2);
  const line = `${result.subtype}: ${result.num_turns} turns, ${minutes} min, ~$${cost} (estimate)`;
  return result.result ? `${line}\n\n${result.result}` : line;
}
