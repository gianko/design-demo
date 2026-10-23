import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { sessionArgs, transcriptPath } from "./session.ts";

describe("sessionArgs", () => {
  const args = sessionArgs("Screen");

  test("runs the skill headless on the component", () => {
    expect(args.slice(0, 2)).toEqual(["-p", "/build-component Screen"]);
  });

  test("loads project settings only, so no user-level hook or plugin leaks in", () => {
    expect(flag(args, "--setting-sources")).toEqual(["project"]);
  });

  test("loads no MCP servers, so no account connector puts output on a canvas", () => {
    expect(args).toContain("--strict-mcp-config");
    expect(args).not.toContain("--mcp-config");
  });

  test("accepts edits and allows only pnpm and npx in Bash", () => {
    expect(flag(args, "--permission-mode")).toEqual(["acceptEdits"]);
    expect(flag(args, "--allowedTools")).toEqual([
      "Bash(pnpm *)",
      "Bash(npx *)",
    ]);
  });

  test("streams the transcript as JSON lines", () => {
    expect(flag(args, "--output-format")).toEqual(["stream-json"]);
    expect(args).toContain("--verbose");
  });
});

// With project settings only, the plugins the session loads are exactly the
// ones the project's settings enable.
test("the project enables frontend-design as its only plugin", () => {
  const settings = JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, "../.claude/settings.json"),
      "utf8"
    )
  );
  expect(settings.enabledPlugins).toEqual({
    "frontend-design@claude-plugins-official": true,
  });
});

describe("transcriptPath", () => {
  const now = new Date("2026-10-23T09:05:07.123Z");

  test("names the component and the start time, under the state home", () => {
    expect(
      transcriptPath("Screen", {
        worktree: "/repo/.claude/worktrees/build-component-screen",
        stateHome: "/home/me/.local/state",
        now,
      })
    ).toBe(
      "/home/me/.local/state/design-demo/runs/Screen-20261023T090507Z.jsonl"
    );
  });

  test("refuses a path inside the session's working tree", () => {
    expect(() =>
      transcriptPath("Screen", {
        worktree: "/repo/.claude/worktrees/build-component-screen",
        stateHome: "/repo/.claude/worktrees/build-component-screen/.state",
        now,
      })
    ).toThrow(/outside the working tree/);
  });
});

// The values after a flag, up to the next flag.
function flag(args: string[], name: string): string[] {
  const at = args.indexOf(name);
  if (at === -1) return [];
  const rest = args.slice(at + 1);
  const end = rest.findIndex((arg) => arg.startsWith("--"));
  return end === -1 ? rest : rest.slice(0, end);
}
